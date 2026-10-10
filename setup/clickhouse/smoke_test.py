"""Verify ClickHouse HTTPS access and one synthetic event using only Python's stdlib.

Reads CLICKHOUSE_URL, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD and optionally
CLICKHOUSE_DATABASE from the environment. With --credentials-file, missing
values can be read from the existing private sponsor credentials Markdown file.
"""

import argparse
import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--credentials-file', type=Path)
    args = parser.parse_args()
    values = {name: os.environ.get(name, '') for name in (
        'CLICKHOUSE_URL', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD',
        'CLICKHOUSE_DATABASE',
    )}
    if args.credentials_file:
        text = args.credentials_file.read_text()
        for name in values:
            match = re.search(r'^\s*' + name + r'\s*=\s*(.*?)\s*$', text, re.M)
            if match and not values[name]:
                values[name] = match[1].strip('\"\x27')
        match = re.search(r"--user\s+'([^:']+):([^']+)'", text)
        if match:
            values['CLICKHOUSE_USER'] = values['CLICKHOUSE_USER'] or match[1]
            values['CLICKHOUSE_PASSWORD'] = values['CLICKHOUSE_PASSWORD'] or match[2]
        match = re.search(r'https://[^\s\x27\x22`]+', text)
        if match:
            values['CLICKHOUSE_URL'] = values['CLICKHOUSE_URL'] or match[0]
    if any(not values[name] for name in (
        'CLICKHOUSE_URL', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD',
    )):
        parser.error('Supply connection environment variables or a private credentials file.')
    url = values['CLICKHOUSE_URL'].rstrip('/')
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not (parsed.hostname or '').endswith('.clickhouse.cloud'):
        parser.error('Expected a ClickHouse Cloud HTTPS endpoint.')
    database = values['CLICKHOUSE_DATABASE'] or 'albert'
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', database):
        parser.error('Invalid database identifier.')
    encoded = base64.b64encode((values['CLICKHOUSE_USER'] + ':' + values['CLICKHOUSE_PASSWORD']).encode()).decode()

    def query(sql):
        request = Request(
            url + '/?' + urlencode({'database': database}),
            data=sql.encode(),
            headers={'Authorization': 'Basic ' + encoded, 'Content-Type': 'text/plain'},
            method='POST',
        )
        with urlopen(request, timeout=30) as response:
            return response.read().decode()

    try:
        if query('SELECT 1').strip() != '1':
            raise ValueError('Unexpected connectivity result.')
        print('HTTPS authentication and database access: PASS')
        run_id = 'setup-smoke-' + str(uuid.uuid4())
        record = {
            'run_id': run_id, 'agent_id': 'albert-setup', 'agent_version': 'setup',
            'event_type': 'setup_smoke_test', 'tool_name': 'clickhouse_https',
            'decision': 'allow', 'outcome': 'success', 'details': '{"synthetic":true}',
        }
        query(f'INSERT INTO {database}.agent_events FORMAT JSONEachRow\n' + json.dumps(record))
        result = json.loads(query(
            f"SELECT count() AS rows FROM {database}.agent_events WHERE run_id = '{run_id}' FORMAT JSONEachRow"
        ))
        if int(result['rows']) != 1:
            raise ValueError('Synthetic event was not read back exactly once.')
        print('Remote HTTPS event insert/read: PASS')
        print('Synthetic test run: ' + run_id)
    except HTTPError as error:
        print('ClickHouse request failed with HTTP ' + str(error.code), file=sys.stderr)
        return 1
    except URLError:
        print('Network connection failed; verify network access and the hostname.', file=sys.stderr)
        return 1
    except (ValueError, KeyError, TimeoutError):
        print('Connection or insert/read verification failed.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
