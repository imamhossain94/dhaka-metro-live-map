// ============================================================
// Dhaka MRT Line 6 — static data
// Stations (north→south), segment running times, geometry, timetable.
// ============================================================

export const ORDER = [
  'Uttara North', 'Uttara Center', 'Uttara South', 'Pallabi', 'Mirpur 11',
  'Mirpur 10', 'Kazipara', 'Shewrapara', 'Agargaon', 'Bijoy Sarani', 'Farmgate',
  'Karwan Bazar', 'Shahbagh', 'Dhaka University', 'Bangladesh Secretariat', 'Motijheel',
];

export const BANGLA = {
  'Uttara North': 'উত্তরা উত্তর', 'Uttara Center': 'উত্তরা সেন্টার', 'Uttara South': 'উত্তরা দক্ষিণ',
  'Pallabi': 'পল্লবী', 'Mirpur 11': 'মিরপুর ১১', 'Mirpur 10': 'মিরপুর ১০', 'Kazipara': 'কাজীপাড়া',
  'Shewrapara': 'শেওড়াপাড়া', 'Agargaon': 'আগারগাঁও', 'Bijoy Sarani': 'বিজয় সরণি', 'Farmgate': 'ফার্মগেট',
  'Karwan Bazar': 'কারওয়ান বাজার', 'Shahbagh': 'শাহবাগ', 'Dhaka University': 'ঢাকা বিশ্ববিদ্যালয়',
  'Bangladesh Secretariat': 'বাংলাদেশ সচিবালয়', 'Motijheel': 'মতিঝিল', 'Kamlapur': 'কমলাপুর',
};

// minutes between consecutive stations (15 segments)
export const SEG = [3, 2, 3, 2, 2, 3, 2, 3, 2, 3, 2, 2, 2, 3, 3];

// coordinates lifted from the official map's image-map (no image used)
export const COORDS = {
  'Uttara North': [224, 63], 'Uttara Center': [224, 185], 'Uttara South': [224, 325], 'Pallabi': [224, 449],
  'Mirpur 11': [225, 588], 'Mirpur 10': [224, 709], 'Kazipara': [225, 857], 'Shewrapara': [313, 943],
  'Agargaon': [313, 1027], 'Bijoy Sarani': [312, 1121], 'Farmgate': [401, 1212], 'Karwan Bazar': [400, 1344],
  'Shahbagh': [402, 1482], 'Dhaka University': [490, 1567], 'Bangladesh Secretariat': [600, 1567],
  'Motijheel': [690, 1654], 'Kamlapur': [754, 1595],
};

// ---- timetable: first/last departures + headway bands per day type ----
const t2m = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const b = (start, end, headway) => ({ s: t2m(start), e: t2m(end), h: headway });

export const SCHEDULES = {
  weekday: {
    label: 'Sun–Thu (Regular)',
    south: { first: t2m('06:30'), last: t2m('21:50'), bands: [
      b('06:30', '07:10', 20), b('07:11', '07:30', 10), b('07:31', '08:10', 8), b('08:11', '09:50', 6),
      b('09:51', '16:22', 8), b('16:23', '19:18', 6), b('19:19', '19:58', 8), b('19:59', '21:00', 10),
      b('21:01', '21:30', 15), b('21:31', '21:50', 20)] },
    north: { first: t2m('07:15'), last: t2m('22:30'), bands: [
      b('07:15', '07:30', 15), b('07:31', '08:10', 10), b('08:11', '08:48', 8), b('08:49', '10:29', 6),
      b('10:30', '17:01', 8), b('17:02', '19:57', 6), b('19:58', '20:20', 8), b('20:21', '21:40', 10),
      b('21:41', '22:10', 15), b('22:11', '22:30', 20)] },
  },
  saturday: {
    label: 'Saturday',
    south: { first: t2m('06:30'), last: t2m('21:50'), bands: [
      b('06:30', '07:10', 20), b('07:11', '07:25', 15), b('07:26', '07:49', 12), b('07:50', '09:49', 10),
      b('09:50', '19:25', 8), b('19:26', '21:00', 10), b('21:01', '21:30', 15), b('21:31', '21:50', 20)] },
    north: { first: t2m('07:15'), last: t2m('22:30'), bands: [
      b('07:15', '07:30', 15), b('07:31', '08:00', 12), b('08:01', '08:24', 10), b('08:25', '20:00', 8),
      b('20:01', '21:40', 10), b('21:41', '22:10', 15), b('22:11', '22:30', 20)] },
  },
  friday: {
    label: 'Friday',
    south: { first: t2m('15:00'), last: t2m('21:50'), bands: [
      b('15:00', '19:56', 8), b('19:57', '21:00', 10), b('21:01', '21:30', 15), b('21:31', '21:50', 20)] },
    // NOTE: source lists "3:20 AM" — a typo for 3:20 PM (Friday service is afternoon-only).
    north: { first: t2m('15:20'), last: t2m('22:30'), bands: [
      b('15:20', '20:31', 8), b('20:32', '21:40', 10), b('21:41', '22:10', 15), b('22:11', '22:30', 20)] },
  },
  govtHoliday: {
    label: 'Govt. Holiday',
    south: { first: t2m('06:30'), last: t2m('21:50'), bands: [
      b('06:30', '07:10', 20), b('07:11', '07:25', 15), b('07:26', '10:37', 12), b('10:38', '21:00', 10),
      b('21:01', '21:30', 15), b('21:31', '21:50', 20)] },
    north: { first: t2m('07:15'), last: t2m('22:30'), bands: [
      b('07:15', '07:30', 15), b('07:31', '11:17', 12), b('11:18', '21:40', 8),
      b('21:41', '22:10', 15), b('22:11', '22:30', 20)] },
  },
};

// Fixed-date national holidays (add lunar Eid dates as needed, "YYYY-MM-DD").
export const HOLIDAYS = new Set([
  '2026-02-21', // Language Martyrs' Day
  '2026-03-26', // Independence Day
  '2026-04-14', // Pohela Boishakh
  '2026-05-01', // May Day
  '2026-12-16', // Victory Day
  '2026-12-25', // Christmas
]);
