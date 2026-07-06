export const weatherConsumptionChartResponse = {
  data: {
    chartData: {
      mode: 'ami',
      dailyData: {
        categories: [
          '2026-03-22',
          '2026-03-23',
          '2026-03-24',
          '2026-03-25',
          '2026-03-26',
          '2026-06-24',
          '2026-06-25',
          '2026-07-04',
          '2026-07-05',
        ],
        consumption: [0, 0, 0, 0, 0, 84.1, 1295.3, 1332.6, 1275.2],
        temperature: [72.1667, 68.125, 65.375, 69.6667, 71.0833, 84.1, 87.25, 87.25, null],
        precipitation: [0, 0, 0, 0, 0, 0, 0, 0, null],
        hasWeatherData: true,
      },
      monthlyData: {
        categories: [
          '2026-03-01',
          '2026-04-01',
          '2026-05-01',
          '2026-06-01',
          '2026-07-01',
        ],
        consumption: [53.36, 311.45185185185, 265.2, 811.83913043478, 1100.46],
        temperature: [67.09583, 69.111103703704, 73.19202173913, 82.146743478261, 85.666675],
        precipitation: [3.1999999881, 109.9999997913, 171.5000002086, 166.7000001149, 3.1000000313],
        hasWeatherData: true,
      },
      colors: {
        consumption: '#5dc7d3',
        temperature: '#f2e4cc',
        temperatureBorder: '#d2a351',
        precipitation: '#666',
      },
    },
    commentary: [],
  },
};

export const viewBillHtml = `<!DOCTYPE html><html><body>
<div class="pay-bill">
  <div class="view-amount"><a href="/index.php/billing/billDetails?billID=1829047">$216.29</a></div>
  <div class="account"><span>Account Number: </span><span><var>1353310-153414</var></span></div>
</div>
<div class="section billing-table pending-payments">
<table class="bill"><tbody>
<tr><td width="125"><span isolate>Jun</span> <var>10</var>, <var>2026</var><td width="125">Bill</td><td width="125"><var>$216.29</var><td><a href="/index.php/billing/billDetails?billID=1829047"></a></td></tr>
<tr><td width="125"><span isolate>May</span> <var>10</var>, <var>2026</var><td width="125">Bill</td><td width="125"><var>$235.43</var><td><a href="/index.php/billing/billDetails?billID=1804461"></a></td></tr>
<tr><td width="125"><span isolate>Apr</span> <var>10</var>, <var>2026</var><td width="125">Bill</td><td width="125"><var>$209.43</var><td><a href="/index.php/billing/billDetails?billID=1785550"></a></td></tr>
</tbody></table></div></body></html>`;

export const loginPageHtml = `<!DOCTYPE html><html><body>
<form action="/index.php/welcome/login" method="post">
  <input type="hidden" name="token" value="" />
  <input type="email" name="email" />
  <input type="password" name="password" />
</form>
</body></html>`;

export const loginSuccessHtml = `<!DOCTYPE html><html><body>
<div id="account-navigation">
  <div>Account Number</div>
  <div>1353310-153414</div>
</div>
</body></html>`;

export const loginErrorHtml = `<!DOCTYPE html><html><body>
<div class="error-message">Invalid email or password</div>
</body></html>`;
