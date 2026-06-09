export const CONTAINS_LOOKUP = 'Icontains';
export const DEFAULT_DEBOUNCE_TIME = 500;
export const DEFAULT_PAGE_SIZE = 10;
export const EMPTY_STRING = '';
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export const RIGHT_INDIVIDUAL_SEARCH = 159001;
export const RIGHT_INDIVIDUAL_CREATE = 159002;
export const RIGHT_INDIVIDUAL_UPDATE = 159003;
export const RIGHT_INDIVIDUAL_DELETE = 159004;

export const RIGHT_GROUP_INDIVIDUAL_SEARCH = RIGHT_INDIVIDUAL_SEARCH;
export const RIGHT_GROUP_INDIVIDUAL_CREATE = RIGHT_INDIVIDUAL_CREATE;
export const RIGHT_GROUP_INDIVIDUAL_UPDATE = RIGHT_INDIVIDUAL_UPDATE;
export const RIGHT_GROUP_INDIVIDUAL_DELETE = RIGHT_INDIVIDUAL_DELETE;

export const RIGHT_GROUP_SEARCH = 180001;
export const RIGHT_GROUP_CREATE = 180002;
export const RIGHT_GROUP_UPDATE = 180003;
export const RIGHT_GROUP_DELETE = 180004;
export const RIGHT_PMT_RERUN = 180005;

export const RIGHT_SCHEMA_SEARCH = 171001;

// Survey Monitoring Dashboard — same code the api_etl backend gates on
// (ApiEtlConfig.gql_query_api_etl_rule_perms = ["953001"]).
export const RIGHT_SURVEY_DASHBOARD = 953001;

export const BENEFIT_PLANS_LIST_TAB_VALUE = 'BenefitPlansListTab';
export const INDIVIDUALS_LIST_TAB_VALUE = 'IndividualsListTab';
export const INDIVIDUAL_CHANGELOG_TAB_VALUE = 'IndividualChangelogTab';
export const INDIVIDUAL_TASK_TAB_VALUE = 'IndividualTaskTab';
export const GROUP_CHANGELOG_TAB_VALUE = 'GroupChangelogTab';
export const GROUP_INDIVIDUAL_HISTORY_TAB_VALUE = 'GroupIndividualHistoryTab';
export const GROUP_TASK_TAB_VALUE = 'GroupTaskTab';
export const BENEFITS_TAB_VALUE = 'BenefitTaskTab';
export const INDIVIDUAL_TABS_LABEL_CONTRIBUTION_KEY = 'individual.TabPanel.label';
export const INDIVIDUAL_TABS_PANEL_CONTRIBUTION_KEY = 'individual.TabPanel.panel';

export const GROUPS_TABS_LABEL_CONTRIBUTION_KEY = 'group.TabPanel.label';
export const GROUPS_TABS_PANEL_CONTRIBUTION_KEY = 'group.TabPanel.panel';

export const BENEFIT_PLAN_TABS_LABEL_CONTRIBUTION_KEY = 'individual.BenefitPlansListTabLabel';
export const BENEFIT_PLAN_TABS_PANEL_CONTRIBUTION_KEY = 'individual.BenefitPlansListTabPanel';
export const TASK_CONTRIBUTION_KEY = 'tasksManagement.tasks';
export const BENEFITS_CONTRIBUTION_KEY = 'payroll.benefitConsumptionPayrollSearcher';
export const GROUP_ROUTE_GROUP = 'individual.route.group';

export const ELIGIBLE_HOUSEHOLDS_ROUTE = 'individual/eligible-households';

export const BENEFICIARY_STATUS = {
  POTENTIAL: 'POTENTIAL',
  ACTIVE: 'ACTIVE',
  GRADUATED: 'GRADUATED',
  SUSPENDED: 'SUSPENDED',
};

export const DEFAULT_BENEFICIARY_STATUS = 'POTENTIAL';

export const GROUP_INDIVIDUAL_ROLES = {
  HEAD: 'HEAD',
  SPOUSE: 'SPOUSE',
  SON: 'SON',
  DAUGHTER: 'DAUGHTER',
  GRANDFATHER: 'GRANDFATHER',
  GRANDMOTHER: 'GRANDMOTHER',
  GRANDSON: 'GRANDSON',
  GRANDDAUGHTER: 'GRANDDAUGHTER',
  MOTHER: 'MOTHER',
  FATHER: 'FATHER',
  SISTER: 'SISTER',
  BROTHER: 'BROTHER',
  OTHER_RELATIVE: 'OTHER RELATIVE',
  NOT_RELATED: 'NOT RELATED',
};

export const RECIPIENT_TYPE = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
};

export const GROUP_INDIVIDUAL_ROLES_LIST = [
  GROUP_INDIVIDUAL_ROLES.HEAD,
  GROUP_INDIVIDUAL_ROLES.SPOUSE,
  GROUP_INDIVIDUAL_ROLES.SON,
  GROUP_INDIVIDUAL_ROLES.DAUGHTER,
  GROUP_INDIVIDUAL_ROLES.GRANDFATHER,
  GROUP_INDIVIDUAL_ROLES.GRANDMOTHER,
  GROUP_INDIVIDUAL_ROLES.GRANDSON,
  GROUP_INDIVIDUAL_ROLES.GRANDDAUGHTER,
  GROUP_INDIVIDUAL_ROLES.MOTHER,
  GROUP_INDIVIDUAL_ROLES.FATHER,
  GROUP_INDIVIDUAL_ROLES.SISTER,
  GROUP_INDIVIDUAL_ROLES.BROTHER,
  GROUP_INDIVIDUAL_ROLES.OTHER_RELATIVE,
  GROUP_INDIVIDUAL_ROLES.NOT_RELATED,
];

export const RECIPIENT_TYPE_LIST = [
  RECIPIENT_TYPE.PRIMARY,
  RECIPIENT_TYPE.SECONDARY,
];

export const BENEFIT_PLAN_LABEL = 'BenefitPlan';
export const INDIVIDUAL_LABEL = 'Individual';
export const GROUP_LABEL = 'Group';
export const BENEFITS_LABEL = 'Benefits';

export const INDIVIDUAL_MODULE_NAME = 'individual';

export const FETCH_BENEFIT_PLAN_SCHEMA_FIELDS_REF = 'socialProtection.fetchBenefitPlanSchemaFields';
export const INDIVIDUAL_ENROLMENT_DIALOG_CONTRIBUTION_KEY = 'individual.IndividualsEnrolmentDialog';
export const INDIVIDUALS_UPLOAD_FORM_CONTRIBUTION_KEY = 'individual.IndividualsUploadDialog';
export const INDIVIDUAL_GROUP_MENU_CONTRIBUTION_KEY = 'individual.group.GroupMenu';
export const CLEARED_STATE_FILTER = {
  field: '', filter: '', type: '', value: '',
};
export const INDIVIDUAL = 'Individual';
export const GROUP = 'Group';
export const INTEGER = 'integer';
export const STRING = 'string';
export const BOOLEAN = 'boolean';
export const DATE = 'date';
export const BOOL_OPTIONS = [
  { value: 'True', label: 'True' },
  { value: 'False', label: 'False' },
];
export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  TRIGGERED: 'TRIGGERED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
  WAITING_FOR_VERIFICATION: 'WAITING_FOR_VERIFICATION',
  FAIL: 'FAIL',
};
export const INDIVIDUALS_QUANTITY_LIMIT = 15;
export const PYTHON_DEFAULT_IMPORT_WORKFLOW = 'Python Import Individuals';

export const TASK_STATUS = {
  RECEIVED: 'RECEIVED',
  ACCEPTED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export const APPROVED = 'APPROVED';
export const FAILED = 'FAILED';
export const ACCEPT = 'ACCEPT';
export const REJECT = 'REJECT';

// PMT Configuration Constants
export const ROUTE_PMT_CONFIGURATION = 'pmt-configuration';
export const PMT_DEFAULT_CUTOFF = 11.01;
export const PMT_CUTOFF_MIN = 0;
export const PMT_CUTOFF_MAX = 50;

// PMT Configuration page — canonical Contributions tab system
export const PMT_RERUN_TAB_VALUE = 'PmtRerunTab';
export const PMT_ADJUSTMENT_TAB_VALUE = 'PmtAdjustmentTab';
export const PMT_FORMULA_TAB_VALUE = 'PmtFormulaTab';
export const PMT_CONFIG_TABS_LABEL_CONTRIBUTION_KEY = 'pmtConfiguration.TabPanel.label';
export const PMT_CONFIG_TABS_PANEL_CONTRIBUTION_KEY = 'pmtConfiguration.TabPanel.panel';

// Maker-checker: taskCode/source for the global formula approval task + maker right
export const PMT_FORMULA_LABEL = 'PmtGlobalFormula';
export const PMT_FORMULA_TASK_SOURCE = 'PmtGlobalFormulaService';
export const RIGHT_PMT_FORMULA_UPDATE = 180007;

// Default coefficients shown when the backend hasn't provisioned a formula yet.
export const PMT_FORMULA_DEFAULTS = {
  cutoff: 11.01,
  intercept: 11.688,
  household_size_coef: -0.10,
  working_age_coef: -0.043,
  urban_coef: 0.0,
  assets: {},
};

export const PMT_CLASS = {
  POOR: 'POOR',
  NON_POOR: 'NON_POOR',
  ALL: 'ALL',
};

export const PMT_CLASS_LABELS = {
  POOR: 'Poor',
  NON_POOR: 'Non-Poor',
  ALL: 'All',
};

export const PMT_CLASS_COLORS = {
  POOR: '#d32f2f',
  NON_POOR: '#388e3c',
};

export const PMT_NUMBER_OF_MEMBERS_RANGES = {
  ALL: 'ALL',
  RANGE_1_3: '1-3',
  RANGE_4_6: '4-6',
  RANGE_7_PLUS: '7+',
};
