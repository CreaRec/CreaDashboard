export const metersResponse = {
  data: [
    {
      esiid: '10443720012345678',
      meterNumber: 'M1234567',
      address: '123 Main St, Austin, TX 78701',
    },
  ],
};

export const monthlyResponse = {
  monthlyData: [
    { startdate: '01/01/2026', enddate: '01/30/2026', actl_kwh_usg: 298, errmsg: 'Success' },
    { startdate: '01/30/2026', enddate: '03/02/2026', actl_kwh_usg: 275, errmsg: 'Success' },
    { startdate: '03/02/2026', enddate: '04/01/2026', actl_kwh_usg: 260, errmsg: 'Success' },
    { startdate: '04/01/2026', enddate: '05/01/2026', actl_kwh_usg: 285, errmsg: 'Success' },
    { startdate: '05/01/2026', enddate: '06/01/2026', actl_kwh_usg: 310, errmsg: 'Success' },
    { startdate: '06/01/2026', enddate: '07/01/2026', actl_kwh_usg: 342, errmsg: 'Success' },
  ],
};

export const intervalResponse = {
  intervaldata: [
    {
      date: '07/04/2026',
      starttime: '12:00 am',
      consumption: 0.155,
    },
    {
      date: '07/04/2026',
      starttime: '12:15 am',
      consumption: 0.474,
    },
    {
      date: '07/04/2026',
      starttime: '12:30 am',
      consumption: 0.282,
    },
    {
      date: '07/04/2026',
      starttime: '12:45 am',
      consumption: 0.304,
    },
  ],
};

export const odrPendingResponse = {
  data: {
    odrstatus: 'PENDING',
  },
};

export const odrCompletedResponse = {
  data: {
    odrstatus: 'COMPLETED',
    odrread: '67856.565',
    odrdate: '2026-07-05T10:30:00-05:00',
  },
};

export const authResponse = {
  token: 'mock-smt-token',
};
