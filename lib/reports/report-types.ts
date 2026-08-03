export type ReportScope = "ALL" | "DOJO" | "MEMBER";

export type ReportKey =
    | "members"
    | "students"
    | "instructors"
    | "dojo_owners"
    | "dojo_managers"
    | "dojos"
    | "dojo_applications"
    | "gradings"
    | "grading_events"
    | "grading_applications"
    | "certificate_requests"
    | "events"
    | "event_registrations"
    | "announcements"
    | "shop_products"
    | "shop_orders"
    | "shop_order_items"
    | "dojo_sales"
    | "dojo_sale_items"
    | "dojo_inventory"
    | "tournaments"
    | "tournament_participants"
    | "tournament_matches"
    | "achievements"
    | "student_achievements"
    | "transfer_requests"
    | "service_requests"
    | "services"
    | "service_coupons"
    | "payment_transactions"
    | "notifications";

export interface ReportDefinition {
    key: ReportKey;
    label: string;
    group: "Members" | "Dojos" | "Ranking" | "Events" | "Shop" | "Tournaments" | "Achievements" | "Payments" | "Services" | "System";
    /** Whether this report can be scoped to a specific dojo. */
    supportsDojoScope: boolean;
    /** Whether this report can be scoped to a specific member. */
    supportsMemberScope: boolean;
    /** Whether this report supports a date range filter. */
    supportsDateRange: boolean;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
    { key: "members", label: "All Users (Members)", group: "Members", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "students", label: "Students", group: "Members", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "instructors", label: "Instructors", group: "Members", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "dojo_managers", label: "Dojo Managers", group: "Members", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "dojo_owners", label: "Dojo Owners", group: "Members", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },

    { key: "dojos", label: "Dojos", group: "Dojos", supportsDojoScope: true, supportsMemberScope: false, supportsDateRange: true },
    { key: "dojo_applications", label: "Dojo Enlistment Applications", group: "Dojos", supportsDojoScope: false, supportsMemberScope: true, supportsDateRange: true },

    { key: "gradings", label: "Gradings (Results)", group: "Ranking", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "grading_events", label: "Grading Events (Exams)", group: "Ranking", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: true },
    { key: "grading_applications", label: "Grading Applications", group: "Ranking", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "certificate_requests", label: "Certificate Requests", group: "Ranking", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },

    { key: "events", label: "Events", group: "Events", supportsDojoScope: true, supportsMemberScope: false, supportsDateRange: true },
    { key: "event_registrations", label: "Event Registrations / Participants", group: "Events", supportsDojoScope: false, supportsMemberScope: true, supportsDateRange: true },
    { key: "announcements", label: "Announcements", group: "Events", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },

    { key: "shop_products", label: "Shop Products", group: "Shop", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: true },
    { key: "shop_orders", label: "Shop Orders", group: "Shop", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "shop_order_items", label: "Shop Order Items", group: "Shop", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: true },
    { key: "dojo_sales", label: "Dojo Sales (Receipts)", group: "Shop", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "dojo_sale_items", label: "Dojo Sale Items", group: "Shop", supportsDojoScope: true, supportsMemberScope: false, supportsDateRange: true },
    { key: "dojo_inventory", label: "Dojo Inventory", group: "Shop", supportsDojoScope: true, supportsMemberScope: false, supportsDateRange: false },

    { key: "tournaments", label: "Tournaments", group: "Tournaments", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: true },
    { key: "tournament_participants", label: "Tournament Participants", group: "Tournaments", supportsDojoScope: false, supportsMemberScope: true, supportsDateRange: true },
    { key: "tournament_matches", label: "Tournament Matches", group: "Tournaments", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: true },

    { key: "achievements", label: "Achievements Catalog", group: "Achievements", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: false },
    { key: "student_achievements", label: "Student Achievements (Earned)", group: "Achievements", supportsDojoScope: false, supportsMemberScope: true, supportsDateRange: true },

    { key: "transfer_requests", label: "Student Transfer Requests", group: "Services", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "service_requests", label: "Service Requests", group: "Services", supportsDojoScope: true, supportsMemberScope: true, supportsDateRange: true },
    { key: "services", label: "Services Catalog", group: "Services", supportsDojoScope: false, supportsMemberScope: false, supportsDateRange: false },
    { key: "service_coupons", label: "Service Coupons", group: "Services", supportsDojoScope: true, supportsMemberScope: false, supportsDateRange: true },

    { key: "payment_transactions", label: "Payment Transactions", group: "Payments", supportsDojoScope: false, supportsMemberScope: true, supportsDateRange: true },

    { key: "notifications", label: "Notifications", group: "System", supportsDojoScope: false, supportsMemberScope: true, supportsDateRange: true },
];
