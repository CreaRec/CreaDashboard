import * as XLSX from 'xlsx';

export const loginPageHtml = `<!DOCTYPE html>
<html>
<body>
<form action="/accountcenter/logon/authenticate.html" method="post">
  <input type="hidden" name="csrfToken" value="abc123" />
  <input type="text" name="username" />
  <input type="password" name="password" />
</form>
</body>
</html>`;

export const usageLandingHtml = `<!DOCTYPE html>
<html><body><h1>Usage History</h1></body></html>`;

export function buildMonthlyXlsBuffer(): Buffer {
  const rows = [
    {
      Consumption: 42.5,
      'Charge Date': new Date(Date.UTC(2026, 3, 15)),
      'Billing Month': 'April 2026',
      'Meter Read Date': '2026-04-14',
      'Avg Temp': 62,
    },
    {
      Consumption: 18.2,
      'Charge Date': new Date(Date.UTC(2026, 4, 16)),
      'Billing Month': 'May 2026',
      'Meter Read Date': '2026-05-15',
      'Avg Temp': 71,
    },
    {
      Consumption: 9.8,
      'Charge Date': new Date(Date.UTC(2026, 5, 14)),
      'Billing Month': 'June 2026',
      'Meter Read Date': '2026-06-13',
      'Avg Temp': 82,
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Monthly');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xls' }) as Buffer;
}

export const billingHistoryHtml = `<!DOCTYPE html>
<html><body>
<table>
  <tr>
    <td>Apr 15, 2026 00:00:00 CDT 2026</td>
    <td>$87.42</td>
    <td><a href="#">View Bill</a></td>
  </tr>
  <tr>
    <td>May 16, 2026 00:00:00 CDT 2026</td>
    <td>$52.18</td>
    <td><a href="#">View Bill</a></td>
  </tr>
  <tr>
    <td>Jun 14, 2026 00:00:00 CDT 2026</td>
    <td>$38.95</td>
    <td><a href="#">View Bill</a></td>
  </tr>
</table>
</body></html>`;

export const loginErrorHtml = `<!DOCTYPE html>
<html><body><input type="password" name="password" />invalid password</body></html>`;
