import type {
  EmployeeProfile,
  JobSite,
  JournalEntry,
  LedgerAccount,
  LiveLocation,
  Payslip,
  TaxRateConfig,
  TeamChatChannel,
  TeamChatMessage,
  TimeEntry,
} from "@/lib/workforce/types";
import {
  generatePayslip,
  hoursFromClock,
  splitRegularOvertime,
} from "@/lib/workforce/payroll";

export const jobSites: JobSite[] = [
  {
    id: "site_1",
    name: "Nordic Tower — Floor 12",
    address: "100 King St W, Toronto, ON",
    clientName: "Nordic Facilities Inc.",
    lat: 43.6487,
    lng: -79.3817,
    radiusM: 150,
  },
  {
    id: "site_2",
    name: "Harbour Dental — Main Clinic",
    address: "555 W Broadway, Vancouver, BC",
    clientName: "Harbour Dental Group",
    lat: 49.2635,
    lng: -123.1385,
    radiusM: 120,
  },
  {
    id: "site_3",
    name: "Cascade Site B",
    address: "1200 6 Ave SW, Calgary, AB",
    clientName: "Cascade Builders",
    lat: 51.0447,
    lng: -114.0719,
    radiusM: 200,
  },
];

export const employees: EmployeeProfile[] = [
  {
    id: "emp_1",
    userId: "user_admin",
    name: "Alex Rivera",
    email: "alex@klirline.demo",
    role: "COMPANY_ADMIN",
    jobTitle: "Operations Director",
    hourlyRate: 55,
    overtimeRate: 82.5,
    status: "active",
    phone: "+1 (514) 555-0101",
    sinMasked: "***-***-142",
    hireDate: "2023-03-01",
    avatarInitials: "AR",
  },
  {
    id: "emp_2",
    userId: "user_mgr",
    name: "Sam Chen",
    email: "sam@klirline.demo",
    role: "MANAGER",
    jobTitle: "Site Manager",
    hourlyRate: 42,
    overtimeRate: 63,
    status: "active",
    phone: "+1 (514) 555-0102",
    sinMasked: "***-***-288",
    hireDate: "2024-01-15",
    avatarInitials: "SC",
  },
  {
    id: "emp_3",
    userId: "user_emp1",
    name: "Jordan Lee",
    email: "jordan@klirline.demo",
    role: "EMPLOYEE",
    jobTitle: "Field Technician",
    hourlyRate: 28,
    overtimeRate: 42,
    status: "active",
    phone: "+1 (514) 555-0103",
    sinMasked: "***-***-401",
    hireDate: "2024-06-01",
    avatarInitials: "JL",
  },
  {
    id: "emp_4",
    userId: "user_emp2",
    name: "Maya Dubois",
    email: "maya@klirline.demo",
    role: "EMPLOYEE",
    jobTitle: "Field Technician",
    hourlyRate: 26,
    overtimeRate: 39,
    status: "active",
    phone: "+1 (514) 555-0104",
    sinMasked: "***-***-519",
    hireDate: "2025-02-10",
    avatarInitials: "MD",
  },
  {
    id: "emp_5",
    userId: "user_emp3",
    name: "Chris Patel",
    email: "chris@klirline.demo",
    role: "EMPLOYEE",
    jobTitle: "Apprentice",
    hourlyRate: 22,
    overtimeRate: 33,
    status: "active",
    phone: "+1 (514) 555-0105",
    sinMasked: "***-***-667",
    hireDate: "2025-09-01",
    avatarInitials: "CP",
  },
];

export const timeEntries: TimeEntry[] = [
  {
    id: "te_1",
    employeeId: "emp_3",
    employeeName: "Jordan Lee",
    jobSiteId: "site_1",
    jobSiteName: "Nordic Tower — Floor 12",
    clockInAt: "2026-07-09T07:58:00",
    clockOutAt: "2026-07-09T16:32:00",
    clockInGeo: {
      lat: 43.6488,
      lng: -79.3816,
      accuracyM: 12,
      address: "On site · King St W",
    },
    clockOutGeo: {
      lat: 43.6487,
      lng: -79.3818,
      accuracyM: 15,
      address: "On site · King St W",
    },
    withinGeofence: true,
    distanceFromSiteM: 18,
    breakMinutes: 30,
    hoursWorked: hoursFromClock(
      "2026-07-09T07:58:00",
      "2026-07-09T16:32:00",
      30
    ),
    status: "approved",
  },
  {
    id: "te_2",
    employeeId: "emp_4",
    employeeName: "Maya Dubois",
    jobSiteId: "site_1",
    jobSiteName: "Nordic Tower — Floor 12",
    clockInAt: "2026-07-09T08:05:00",
    clockOutAt: "2026-07-09T17:10:00",
    clockInGeo: {
      lat: 43.6489,
      lng: -79.3815,
      accuracyM: 10,
      address: "On site",
    },
    clockOutGeo: {
      lat: 43.6486,
      lng: -79.3819,
      accuracyM: 14,
    },
    withinGeofence: true,
    distanceFromSiteM: 25,
    breakMinutes: 30,
    hoursWorked: hoursFromClock(
      "2026-07-09T08:05:00",
      "2026-07-09T17:10:00",
      30
    ),
    status: "approved",
  },
  {
    id: "te_3",
    employeeId: "emp_5",
    employeeName: "Chris Patel",
    jobSiteId: "site_2",
    jobSiteName: "Harbour Dental — Main Clinic",
    clockInAt: "2026-07-10T07:55:00",
    clockInGeo: {
      lat: 49.2636,
      lng: -123.1384,
      accuracyM: 8,
      address: "On site · Broadway",
    },
    withinGeofence: true,
    distanceFromSiteM: 14,
    breakMinutes: 0,
    status: "clocked_in",
    notes: "Currently on site",
  },
  {
    id: "te_4",
    employeeId: "emp_3",
    employeeName: "Jordan Lee",
    jobSiteId: "site_1",
    jobSiteName: "Nordic Tower — Floor 12",
    clockInAt: "2026-07-10T08:02:00",
    clockInGeo: {
      lat: 43.6495,
      lng: -79.3805,
      accuracyM: 20,
      address: "~90m from site",
    },
    withinGeofence: true,
    distanceFromSiteM: 92,
    breakMinutes: 0,
    status: "clocked_in",
  },
  {
    id: "te_5",
    employeeId: "emp_4",
    employeeName: "Maya Dubois",
    jobSiteId: "site_3",
    jobSiteName: "Cascade Site B",
    clockInAt: "2026-07-08T07:45:00",
    clockOutAt: "2026-07-08T16:00:00",
    clockInGeo: {
      lat: 51.0448,
      lng: -114.0718,
      accuracyM: 11,
    },
    clockOutGeo: {
      lat: 51.0446,
      lng: -114.072,
      accuracyM: 13,
    },
    withinGeofence: true,
    distanceFromSiteM: 22,
    breakMinutes: 30,
    hoursWorked: hoursFromClock(
      "2026-07-08T07:45:00",
      "2026-07-08T16:00:00",
      30
    ),
    status: "approved",
  },
];

export const liveLocations: LiveLocation[] = [
  {
    employeeId: "emp_5",
    employeeName: "Chris Patel",
    jobSiteId: "site_2",
    jobSiteName: "Harbour Dental — Main Clinic",
    lat: 49.2636,
    lng: -123.1384,
    updatedAt: "2026-07-10T11:42:00",
    status: "on_site",
  },
  {
    employeeId: "emp_3",
    employeeName: "Jordan Lee",
    jobSiteId: "site_1",
    jobSiteName: "Nordic Tower — Floor 12",
    lat: 43.6489,
    lng: -79.3814,
    updatedAt: "2026-07-10T11:40:00",
    status: "on_site",
  },
];

function buildPayslip(
  emp: EmployeeProfile,
  periodStart: string,
  periodEnd: string,
  regularHours: number,
  overtimeHours: number,
  status: Payslip["status"]
): Payslip {
  const calc = generatePayslip({
    employeeId: emp.id,
    employeeName: emp.name,
    hourlyRate: emp.hourlyRate,
    overtimeRate: emp.overtimeRate,
    regularHours,
    overtimeHours,
    periodStart,
    periodEnd,
  });
  return {
    id: `pay_${emp.id}_${periodStart}`,
    employeeId: emp.id,
    employeeName: emp.name,
    periodStart,
    periodEnd,
    regularHours,
    overtimeHours,
    grossPay: calc.grossPay,
    netPay: calc.netPay,
    lines: calc.lines,
    status,
    generatedAt: "2026-07-09T18:00:00",
  };
}

export const payslips: Payslip[] = [
  buildPayslip(employees[2], "2026-06-30", "2026-07-06", 40, 2.5, "paid"),
  buildPayslip(employees[3], "2026-06-30", "2026-07-06", 38, 1, "paid"),
  buildPayslip(employees[4], "2026-06-30", "2026-07-06", 36, 0, "paid"),
  buildPayslip(employees[2], "2026-07-07", "2026-07-13", 16, 0.5, "draft"),
  buildPayslip(employees[3], "2026-07-07", "2026-07-13", 16.5, 0.8, "draft"),
  buildPayslip(employees[4], "2026-07-07", "2026-07-13", 8, 0, "draft"),
];

export const taxRates: TaxRateConfig[] = [
  { id: "tax_tps", name: "TPS / GST", code: "TPS", rate: 0.05, region: "federal", appliesTo: "sales" },
  { id: "tax_tvq", name: "TVQ", code: "TVQ", rate: 0.09975, region: "QC", appliesTo: "sales" },
  { id: "tax_cpp", name: "CPP employee", code: "CPP", rate: 0.0595, region: "federal", appliesTo: "payroll" },
  { id: "tax_qpp", name: "QPP employee", code: "QPP", rate: 0.064, region: "QC", appliesTo: "payroll" },
  { id: "tax_ei", name: "EI employee", code: "EI", rate: 0.0166, region: "federal", appliesTo: "payroll" },
];

export const ledgerAccounts: LedgerAccount[] = [
  { id: "acc_1000", code: "1000", name: "Cash / Bank", type: "asset", balance: 184250 },
  { id: "acc_1100", code: "1100", name: "Accounts receivable", type: "asset", balance: 42800 },
  { id: "acc_2000", code: "2000", name: "Accounts payable", type: "liability", balance: 12640 },
  { id: "acc_2100", code: "2100", name: "TPS/TVQ payable", type: "liability", balance: 8920 },
  { id: "acc_2200", code: "2200", name: "Payroll liabilities", type: "liability", balance: 15480 },
  { id: "acc_3000", code: "3000", name: "Owner equity", type: "equity", balance: 120000 },
  { id: "acc_4000", code: "4000", name: "Service revenue", type: "revenue", balance: 312400 },
  { id: "acc_5000", code: "5000", name: "Payroll expense", type: "expense", balance: 98600 },
  { id: "acc_5100", code: "5100", name: "Employer contributions", type: "expense", balance: 14200 },
  { id: "acc_5200", code: "5200", name: "Materials & supplies", type: "expense", balance: 22100 },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "je_1",
    date: "2026-07-01",
    memo: "Client payment INV-2026-088",
    reference: "INV-2026-088",
    debitAccount: "1000 Cash / Bank",
    creditAccount: "1100 Accounts receivable",
    amount: 12400,
  },
  {
    id: "je_2",
    date: "2026-07-02",
    memo: "Sales invoice Harbour Dental (excl. tax)",
    reference: "INV-2026-094",
    debitAccount: "1100 Accounts receivable",
    creditAccount: "4000 Service revenue",
    amount: 4174.0,
    taxCode: "TPS+TVQ",
    taxAmount: 626.0,
  },
  {
    id: "je_3",
    date: "2026-07-06",
    memo: "Payroll run week ending Jul 6",
    reference: "PAY-2026-W27",
    debitAccount: "5000 Payroll expense",
    creditAccount: "2200 Payroll liabilities",
    amount: 9840,
  },
  {
    id: "je_4",
    date: "2026-07-07",
    memo: "Remit TPS/TVQ Q2 estimate",
    reference: "TAX-Q2",
    debitAccount: "2100 TPS/TVQ payable",
    creditAccount: "1000 Cash / Bank",
    amount: 4200,
  },
];

export const chatChannels: TeamChatChannel[] = [
  {
    id: "ch_company",
    name: "Company — General",
    type: "company",
    encrypted: true,
    memberIds: employees.map((e) => e.id),
    unread: 2,
  },
  {
    id: "ch_site1",
    name: "Site · Nordic Tower",
    type: "site",
    encrypted: true,
    memberIds: ["emp_2", "emp_3", "emp_4"],
    unread: 0,
  },
  {
    id: "ch_site2",
    name: "Site · Harbour Dental",
    type: "site",
    encrypted: true,
    memberIds: ["emp_2", "emp_5"],
    unread: 1,
  },
  {
    id: "ch_dm",
    name: "DM · Sam ↔ Jordan",
    type: "direct",
    encrypted: true,
    memberIds: ["emp_2", "emp_3"],
    unread: 0,
  },
];

export const chatMessages: TeamChatMessage[] = [
  {
    id: "cm_1",
    channelId: "ch_company",
    senderId: "emp_1",
    senderName: "Alex Rivera",
    body: "Rappel: pointage GPS obligatoire à l'arrivée sur chantier. Pas de pointage hors zone = revue manager.",
    at: "2026-07-09T08:00:00",
    encrypted: true,
  },
  {
    id: "cm_2",
    channelId: "ch_company",
    senderId: "emp_2",
    senderName: "Sam Chen",
    body: "Nordic Tower: accès stationnement P2 aujourd'hui. Badge à la réception.",
    at: "2026-07-10T07:15:00",
    encrypted: true,
  },
  {
    id: "cm_3",
    channelId: "ch_site1",
    senderId: "emp_3",
    senderName: "Jordan Lee",
    body: "Arrivé sur site, pointage OK. Matériel manquant: 2 filtres HVAC.",
    at: "2026-07-10T08:05:00",
    encrypted: true,
  },
  {
    id: "cm_4",
    channelId: "ch_site2",
    senderId: "emp_5",
    senderName: "Chris Patel",
    body: "Clinique ouverte — checklist matin terminée.",
    at: "2026-07-10T08:20:00",
    encrypted: true,
  },
];

/** Aggregate hours from approved/completed entries for payroll generation */
export function aggregateHoursByEmployee(entries: TimeEntry[]) {
  const map = new Map<
    string,
    { employeeId: string; employeeName: string; hours: number }
  >();
  for (const e of entries) {
    if (!e.clockOutAt || e.hoursWorked == null) continue;
    if (!["approved", "clocked_out", "pending_review"].includes(e.status)) continue;
    const prev = map.get(e.employeeId);
    if (prev) {
      prev.hours += e.hoursWorked;
    } else {
      map.set(e.employeeId, {
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        hours: e.hoursWorked,
      });
    }
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    ...splitRegularOvertime(row.hours),
  }));
}
