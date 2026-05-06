/* eslint-disable no-tabs */
import {
  decodeId,
  graphql,
  formatPageQuery,
  formatQuery,
  formatPageQueryWithCount,
  formatMutation,
  formatGQLString,
  graphqlWithVariables,
  prepareMutation,
} from '@openimis/fe-core';
import { ACTION_TYPE } from './reducer';
import {
  CLEAR, ERROR, REQUEST, SET, SUCCESS,
} from './util/action-type';
import {
  ACCEPT, APPROVED, FAILED, REJECT,
} from './constants';

const WORKFLOWS_FULL_PROJECTION = () => ['name', 'group'];

const ENROLLMENT_SUMMARY_FULL_PROJECTION = () => [
  'totalNumberOfIndividuals',
  'numberOfSelectedIndividuals',
  'numberOfIndividualsAssignedToProgramme',
  'numberOfIndividualsNotAssignedToProgramme',
  'numberOfIndividualsAssignedToSelectedProgramme',
  'numberOfIndividualsToUpload',
];

const ENROLLMENT_GROUP_SUMMARY_FULL_PROJECTION = () => [
  'totalNumberOfGroups',
  'numberOfSelectedGroups',
  'numberOfGroupsAssignedToProgramme',
  'numberOfGroupsNotAssignedToProgramme',
  'numberOfGroupsAssignedToSelectedProgramme',
  'numberOfGroupsToUpload',
];

export function fetchWorkflows() {
  const payload = formatQuery(
    'workflow',
    ['group: "individual"'],
    WORKFLOWS_FULL_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.GET_WORKFLOWS);
}

const INDIVIDUAL_FULL_PROJECTION = (mm, withGroupIndividuals = false) => {
  const fields = [
    'id',
    'isDeleted',
    'dateCreated',
    'dateUpdated',
    'firstName',
    'lastName',
    'dob',
    'jsonExt',
    'version',
    'userUpdated {username}',
    'tf4No',
    'interviewKey',
    `location${mm.getProjection('location.Location.FlatProjection')}`,
  ];

  if (withGroupIndividuals) {
    fields.push(
      'groupindividuals (isDeleted: false) { edges { node { group { id } } } }',
    );
  }

  return fields;
};

const NON_CONSENTED_INDIVIDUAL_PROJECTION = (mm) => [
  'id',
  'firstName',
  'lastName',
  'interviewKey',
  'interviewResultsNo',
  `location${mm.getProjection('location.Location.FlatProjection')}`,
];

const INDIVIDUAL_HISTORY_FULL_PROJECTION = (mm) => INDIVIDUAL_FULL_PROJECTION(mm).filter(
  (item) => item !== 'tf4No' && item !== 'interviewKey',
);

const GROUP_INDIVIDUAL_FULL_PROJECTION = [
  'id',
  'individual {id, firstName, lastName, dob}',
  'group {id, code}',
  'role',
  'recipientType',
  'isDeleted',
  'dateCreated',
  'dateUpdated',
  'jsonExt',
];

const GROUP_FULL_PROJECTION = (mm) => [
  'id',
  'code',
  'isDeleted',
  'head {firstName, lastName, uuid}',
  'groupindividuals(isDeleted: false) { edges { node { id } } }',
  'dateCreated',
  'dateUpdated',
  'jsonExt',
  'version',
  'userUpdated {username}',
  `location${mm.getProjection('location.Location.FlatProjection')}`,
];

const GROUP_INDIVIDUAL_HISTORY_FULL_PROJECTION = [
  'id',
  'individual {id, firstName, lastName, dob}',
  'group {id}',
  'role',
  'recipientType',
  'isDeleted',
  'dateCreated',
  'dateUpdated',
  'jsonExt',
  'version',
];

const GROUP_HISTORY_FULL_PROJECTION = (mm) => GROUP_FULL_PROJECTION(mm).filter(
  (item) => item !== 'groupindividuals(isDeleted: false) { edges { node { id } } }',
);

const UPLOAD_HISTORY_FULL_PROJECTION = () => [
  'id',
  'uuid',
  'workflow',
  'dataUpload {uuid, dateCreated, dateUpdated, sourceName, sourceType, status, error }',
  'userCreated {username}',
];

const API_ETL_PROJECTION = () => ['etlServices{nameOfService}'];

const PULLED_QUESTIONNAIRES_PROJECTION = () => [
  'paaName',
  'numberOfHouseholds',
  'numberOfMembers',
  'datePulled',
  'status',
  'errorMessage',
];

const ELIGIBLE_HOUSEHOLD_PROJECTION = (mm) => [
  "id",
  "uuid",
  "code",
  "pmtScoreHousehold",
  "pmtClassHousehold",
  `head { id uuid firstName lastName }`,
  `location {
    id
    uuid
    code
    name
    parent {
      id
      uuid
      code
      name
      parent {
        id
        uuid
        code
        name
        parent {
          id
          uuid
          code
          name
        }
      }
    }
  }`,
];

const ELIGIBLE_MEMBER_PROJECTION = (mm) => [
  "id",
  "uuid",
  "firstName",
  "lastName",
  "dob",
  "dateCreated",
  "dateUpdated",
  "jsonExt",
  `location {
    id
    uuid
    code
    name
    parent {
      id
      uuid
      code
      name
      parent {
        id
        uuid
        code
        name
        parent {
          id
          uuid
          code
          name
        }
      }
    }
  }`,
];

export function fetchApiEtlServices() {
  const payload = formatQuery(
    'etlServicesByServiceName',
    [],
    API_ETL_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.API_ETL_SERVICES);
}

/**
 * Send a fully-formed GraphQL document via graphqlWithVariables.
 * This avoids any malformed-string issues and supports optional filters.
 */
export function fetchPulledQuestionnaires(mm, params = {}) {
  const pageSize = params?.pageSize ?? 10;
  const after = params?.after ?? null;
  const before = params?.before ?? null;

  const regionCode = params?.regionCode ?? null;
  const districtCode = params?.districtCode ?? null;

  const isBackward = !!before;

  const varDefs = ["$pageSize: Int!"];
  const variables = { pageSize };

  const gqlArgs = [];

  if (regionCode) {
    varDefs.push("$regionCode: String");
    variables.regionCode = regionCode;
    gqlArgs.push("regionCode: $regionCode");
  }

  if (districtCode) {
    varDefs.push("$districtCode: String");
    variables.districtCode = districtCode;
    gqlArgs.push("districtCode: $districtCode");
  }

  if (isBackward) {
    varDefs.push("$before: String");
    variables.before = before;
    gqlArgs.push("last: $pageSize");
    gqlArgs.push("before: $before");
  } else {
    gqlArgs.push("first: $pageSize");
    if (after) {
      varDefs.push("$after: String");
      variables.after = after;
      gqlArgs.push("after: $after");
    }
  }

  const query = `
    query PulledQuestionnaires(${varDefs.join(", ")}) {
      pulledQuestionnaires(${gqlArgs.join(", ")}) {
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        edges {
          node {
            paaName
            numberOfHouseholds
            numberOfMembers
            questionnaireVersion
            datePulled
            status
            errorMessage
          }
        }
      }
    }
  `;

  return graphqlWithVariables(query, variables, ACTION_TYPE.PULLED_QUESTIONNAIRES);
}

const AVAILABLE_QUESTIONNAIRES_PROJECTION = () => [
  'identity',
  'id',
  'title',
  'version',
  'variable',
  'lastEntryDate',
  'matchingScore',
  'matchingStrategy',
];

export function fetchAvailableQuestionnaires(
  districtCode = null,
  regionCode = null,
  districtName = null,
  showAll = false,
) {
  const filters = [];
  if (districtCode) filters.push(`districtCode: "${districtCode}"`);
  if (regionCode) filters.push(`regionCode: "${regionCode}"`);
  if (districtName) filters.push(`districtName: "${districtName}"`);
  if (showAll) filters.push(`showAll: ${showAll}`);

  const payload = formatQuery(
    'availableQuestionnaires',
    filters,
    AVAILABLE_QUESTIONNAIRES_PROJECTION(),
  );

  return graphql(payload, ACTION_TYPE.AVAILABLE_QUESTIONNAIRES);
}

export function fetchIndividualEnrollmentSummary(params) {
  const payload = formatQuery(
    'individualEnrollmentSummary',
    params,
    ENROLLMENT_SUMMARY_FULL_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.ENROLLMENT_SUMMARY);
}

export function fetchGroupEnrollmentSummary(params) {
  const payload = formatQuery(
    'groupEnrollmentSummary',
    params,
    ENROLLMENT_GROUP_SUMMARY_FULL_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.ENROLLMENT_GROUP_SUMMARY);
}

export function fetchIndividuals(mm, params) {
  const payload = formatPageQueryWithCount(
    'individual',
    params,
    INDIVIDUAL_FULL_PROJECTION(mm),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_INDIVIDUALS);
}
//==================NON CONSENTED========================
export function fetchNonConsentedHouseholds(mm, params = {}) {
  const normalizeFilters = (filters) => {
    if (!filters) return [];
    if (Array.isArray(filters)) return filters.filter(Boolean);
    if (typeof filters === 'object') {
      return Object.values(filters)
        .map((x) => x?.filter)
        .filter(Boolean);
    }
    return [];
  };

  const getParamsState = (input) => {
    if (Array.isArray(input)) {
      const filterStrings = input.filter(Boolean);
      const extractString = (prefix) => {
        const item = filterStrings.find((f) => f.startsWith(prefix));
        const match = item?.match(/"([^"]+)"/);
        return match?.[1] ?? null;
      };
      const extractNumber = (prefix) => {
        const item = filterStrings.find((f) => f.startsWith(prefix));
        const match = item?.match(/:\s*(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      return {
        pageSize: extractNumber('first') || extractNumber('last') || 10,
        after: extractString('after'),
        before: extractString('before'),
        extraFilters: filterStrings.filter(
          (filter) => !['first:', 'last:', 'after:', 'before:', 'orderBy:'].some((prefix) => filter.startsWith(prefix)),
        ),
      };
    }

    return {
      pageSize: input?.pageSize ?? input?.first ?? 10,
      after: input?.after ?? null,
      before: input?.before ?? null,
      extraFilters: normalizeFilters(input?.filters),
    };
  };

  const {
    pageSize,
    after,
    before,
    extraFilters,
  } = getParamsState(params);
  const isBackward = !!before;

  const varDefs = ['$pageSize: Int!'];
  const variables = { pageSize };

  const gqlArgs = [
    'isNonConsented: true',
    'isDeleted: false',
    ...extraFilters,
  ];

  if (isBackward) {
    varDefs.push('$before: String');
    variables.before = before;
    gqlArgs.push('last: $pageSize');
    gqlArgs.push('before: $before');
  } else {
    gqlArgs.push('first: $pageSize');
    if (after) {
      varDefs.push('$after: String');
      variables.after = after;
      gqlArgs.push('after: $after');
    }
  }

  const query = `
    query (${varDefs.join(", ")}) {
      individual(${gqlArgs.join(", ")}) {
        totalCount
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        edges {
          node {
            ${NON_CONSENTED_INDIVIDUAL_PROJECTION(mm).join("\n")}
          }
        }
      }
    }
  `;

  return graphqlWithVariables(
    query,
    variables,
    ACTION_TYPE.SEARCH_NONCONSENTED_HOUSEHOLDS,
  );
}

export function fetchNonConsentedHouseholdsForExport(mm, params = {}) {
  const normalizeFilters = (filters) => {
    if (!filters) return [];
    if (Array.isArray(filters)) return filters.filter(Boolean);
    if (typeof filters === 'object') {
      return Object.values(filters)
        .map((x) => x?.filter)
        .filter(Boolean);
    }
    return [];
  };

  const extraFilters = Array.isArray(params)
    ? params.filter(
      (filter) => filter && !['first:', 'last:', 'after:', 'before:', 'orderBy:'].some((prefix) => filter.startsWith(prefix)),
    )
    : normalizeFilters(params.filters);
  const pageSize = 100;

  return async (dispatch) => {
    let after = null;
    let hasNextPage = true;
    let totalCount = 0;
    const edges = [];

    while (hasNextPage) {
      const query = `
        query ($pageSize: Int!, $after: String) {
          individual(
            isNonConsented: true,
            isDeleted: false,
            ${extraFilters.join(", ")}
            first: $pageSize
            after: $after
          ) {
            totalCount
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
            edges {
              node {
                ${NON_CONSENTED_INDIVIDUAL_PROJECTION(mm).join("\n")}
              }
            }
          }
        }
      `;

      const response = await dispatch(
        graphqlWithVariables(
          query,
          { pageSize, after },
          ACTION_TYPE.EXPORT_NONCONSENTED_HOUSEHOLDS,
        ),
      );

      const page = response?.payload?.data?.individual;
      if (!page) {
        return response;
      }

      totalCount = page.totalCount ?? totalCount;
      edges.push(...(page.edges || []));

      hasNextPage = !!page.pageInfo?.hasNextPage;
      after = page.pageInfo?.endCursor ?? null;

      if (!hasNextPage || !after || (totalCount && edges.length >= totalCount)) {
        hasNextPage = false;
      }
    }

    return {
      payload: {
        data: {
          individual: {
            totalCount,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: edges[0]?.cursor ?? null,
              endCursor: null,
            },
            edges,
          },
        },
      },
    };
  };
}

export function fetchGroupIndividuals(params) {
  const payload = formatPageQueryWithCount(
    'groupIndividual',
    params,
    GROUP_INDIVIDUAL_FULL_PROJECTION,
  );
  return graphql(payload, ACTION_TYPE.SEARCH_GROUP_INDIVIDUALS);
}

export function fetchGroups(mm, params) {
  const payload = formatPageQueryWithCount(
    'group',
    params,
    GROUP_FULL_PROJECTION(mm),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_GROUPS);
}

export function fetchIndividual(mm, params) {
  const payload = formatPageQuery(
    'individual',
    params,
    INDIVIDUAL_FULL_PROJECTION(mm, true),
  );
  return graphql(payload, ACTION_TYPE.GET_INDIVIDUAL);
}

export function fetchIndividualHistory(mm, params) {
  const payload = formatPageQueryWithCount(
    'individualHistory',
    params,
    INDIVIDUAL_HISTORY_FULL_PROJECTION(mm),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_INDIVIDUAL_HISTORY);
}

export function fetchGroup(mm, params) {
  const payload = formatPageQuery('group', params, GROUP_FULL_PROJECTION(mm));
  return graphql(payload, ACTION_TYPE.GET_GROUP);
}

export function fetchGroupHistory(mm, params) {
  const payload = formatPageQueryWithCount(
    'groupHistory',
    params,
    GROUP_HISTORY_FULL_PROJECTION(mm),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_GROUP_HISTORY);
}

export function fetchGroupIndividualHistory(params) {
  const payload = formatPageQueryWithCount(
    'groupIndividualHistory',
    params,
    GROUP_INDIVIDUAL_HISTORY_FULL_PROJECTION,
  );
  return graphql(payload, ACTION_TYPE.SEARCH_GROUP_INDIVIDUAL_HISTORY);
}

export function fetchUploadHistory(params) {
  const payload = formatPageQueryWithCount(
    'individualDataUploadHistory',
    params,
    UPLOAD_HISTORY_FULL_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.GET_INDIVIDUAL_UPLOAD_HISTORY);
}

export function deleteIndividual(individual, clientMutationLabel) {
  const individualUuids = `ids: ["${individual?.id}"]`;
  const mutation = formatMutation(
    'deleteIndividual',
    individualUuids,
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.DELETE_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.DELETE_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function fetchEligibleHouseholds(mm, params) {
  const payload = formatPageQueryWithCount(
    "group",
    params,
    ELIGIBLE_HOUSEHOLD_PROJECTION(mm),
  );
  return graphql(payload, ACTION_TYPE.FETCH_ELIGIBLE_HOUSEHOLDS);
}

export function fetchEligibleMembers(mm, params) {
  const payload = formatPageQueryWithCount(
    "individual",
    params,
    ELIGIBLE_MEMBER_PROJECTION(mm),
  );
  return graphql(payload, ACTION_TYPE.FETCH_ELIGIBLE_MEMBERS);
}

export function undoDeleteIndividual(individual, clientMutationLabel) {
  const individualUuids = `ids: ["${individual?.id}"]`;
  const mutation = formatMutation(
    'undoDeleteIndividual',
    individualUuids,
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.UNDO_DELETE_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.UNDO_DELETE_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function deleteGroupIndividual(groupIndividual, clientMutationLabel) {
  const groupIndividualUuids = `ids: ["${groupIndividual?.id}"]`;
  const mutation = formatMutation(
    'removeIndividualFromGroup',
    groupIndividualUuids,
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.DELETE_GROUP_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.DELETE_GROUP_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function deleteGroup(group, clientMutationLabel) {
  const groupUuids = `ids: ["${group?.id}"]`;
  const mutation = formatMutation(
    'deleteGroup',
    groupUuids,
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.DELETE_GROUP),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.DELETE_GROUP,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

function dateTimeToDate(date) {
  return date.split('T')[0];
}

function formatGroupGQL(group, groupIndividualId = null) {
  return `
	  ${group?.id ? `id: "${group.id}"` : ''}
	  ${group?.location ? `locationId: ${decodeId(group.location.id)}` : ''}
	  // eslint-disable-next-line no-tabs
	  ${groupIndividualId ? `groupIndividualId: "${groupIndividualId}"` : ''}`;
}

function formatCreateGroupGQL(group) {
  return `
	  ${group?.code ? `code: "${group.code}"` : ''}
	  ${group?.location ? `locationId: ${decodeId(group.location.id)}` : ''}
	  ${'individualsData: []'}
	`;
}

function formatIndividualGQL(individual) {
  return `
	  ${individual?.id ? `id: "${individual.id}"` : ''}
	  ${
  individual?.firstName
    ? `firstName: "${formatGQLString(individual.firstName)}"`
    : ''
}
	  ${
  individual?.lastName
    ? `lastName: "${formatGQLString(individual.lastName)}"`
    : ''
}
	  ${individual?.jsonExt ? `jsonExt: ${JSON.stringify(individual.jsonExt)}` : ''}
	  ${individual?.dob ? `dob: "${dateTimeToDate(individual.dob)}"` : ''}
	  ${
  individual?.location
    ? `locationId: ${decodeId(individual.location.id)}`
    : ''
}
	`;
}

function formatGroupIndividualGQL(groupIndividual) {
  return `
	  ${groupIndividual?.id ? `id: "${groupIndividual.id}"` : ''}
	  ${groupIndividual?.role ? `role: ${groupIndividual.role}` : ''}
	  ${
  groupIndividual?.recipientType
    ? `recipientType: ${groupIndividual.recipientType}`
    : ''
}
	  ${
  groupIndividual?.individual.id
    ? `individualId: "${groupIndividual.individual.id}"`
    : ''
}
	  ${groupIndividual?.group.id ? `groupId: "${groupIndividual.group.id}"` : ''}`;
}

function formatCreateGroupIndividualGQL(groupIndividual) {
  return `
	  ${groupIndividual?.id ? `id: "${groupIndividual.id}"` : ''}
	  ${groupIndividual?.role ? `role: ${groupIndividual.role}` : ''}
	  ${
  groupIndividual?.recipientType
    ? `recipientType: ${groupIndividual.recipientType}`
    : ''
}
	  ${
  groupIndividual?.individual.id
    ? `individualId: "${groupIndividual.individual.id}"`
    : ''
}
	  ${groupIndividual?.group.id ? `groupId: "${groupIndividual.group.id}"` : ''}`;
}

function formatConfirmEnrollmentGQL(params) {
  return `
	  ${params?.customFilters ? `customFilters: ${params.customFilters}` : ''}
	  ${params?.benefitPlanId ? `benefitPlanId: ${params.benefitPlanId}` : ''}
	  ${params?.status ? `status: ${params.status}` : ''}`;
}

export function updateIndividual(individual, clientMutationLabel) {
  const mutation = formatMutation(
    'updateIndividual',
    formatIndividualGQL(individual),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.UPDATE_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.UPDATE_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function confirmEnrollment(params, clientMutationLabel) {
  // eslint-disable-next-line max-len
  const mutation = formatMutation(
    'confirmIndividualEnrollment',
    formatConfirmEnrollmentGQL(params),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.CONFIRM_ENROLLMENT),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.UPDATE_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function confirmGroupEnrollment(params, clientMutationLabel) {
  // eslint-disable-next-line max-len
  const mutation = formatMutation(
    'confirmGroupEnrollment',
    formatConfirmEnrollmentGQL(params),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.CONFIRM_GROUP_ENROLLMENT),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.UPDATE_GROUP,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function updateGroupIndividual(groupIndividual, clientMutationLabel) {
  const mutation = formatMutation(
    'editIndividualInGroup',
    formatGroupIndividualGQL(groupIndividual),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.UPDATE_GROUP_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.UPDATE_GROUP_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function creteGroupIndividual(groupIndividual, clientMutationLabel) {
  const mutation = formatMutation(
    'addIndividualToGroup',
    formatCreateGroupIndividualGQL(groupIndividual),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.CREATE_GROUP_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.CREATE_GROUP_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function createGroupAndMoveIndividual(
  group,
  individualIds,
  clientMutationLabel,
) {
  const mutation = formatMutation(
    'createGroupAndMoveIndividual',
    formatGroupGQL(group, individualIds),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.CREATE_GROUP_AND_MOVE_INDIVIDUAL),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.CREATE_GROUP_AND_MOVE_INDIVIDUAL,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function updateGroup(group, clientMutationLabel) {
  const mutation = formatMutation(
    'updateGroup',
    formatGroupGQL(group),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.UPDATE_GROUP),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.UPDATE_GROUP,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function createGroup(group, clientMutationLabel) {
  const mutation = formatMutation(
    'createGroup',
    formatCreateGroupGQL(group),
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.MUTATION),
      SUCCESS(ACTION_TYPE.CREATE_GROUP),
      ERROR(ACTION_TYPE.MUTATION),
    ],
    {
      actionType: ACTION_TYPE.CREATE_GROUP,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function fetchPendingGroupUploads(variables) {
  return graphqlWithVariables(
    `
		query (
		  $upload_Id: ID, $group_Id_Isnull: Boolean
		  ${variables.after ? ',$after: String' : ''} 
		  ${variables.before ? ',$before: String' : ''}
		  ${variables.pageSize ? ',$pageSize: Int' : ''}
		  ${variables.isDeleted !== undefined ? ',$isDeleted: Boolean' : ''}
		) {
		  groupDataSource(
			upload_Id: $upload_Id, group_Id_Isnull:$group_Id_Isnull, 
			${variables.isDeleted !== undefined ? ',isDeleted: $isDeleted' : ''}
			${variables.before ? ',before:$before, last:$pageSize' : ''}
			${!variables.before ? ',first:$pageSize' : ''}
			${variables.after ? ',after:$after' : ''}
		  )
		  {
			totalCount
			pageInfo { hasNextPage, hasPreviousPage, startCursor, endCursor}
			edges
			{
			  node
			  {
				id, uuid, jsonExt, group { code }
				
			  }
			}
		  }
		}
	  `,
    variables,
    ACTION_TYPE.GET_PENDING_GROUPS_UPLOAD,
  );
}

export const formatTaskResolveGQL = (
  task,
  user,
  approveOrFail,
  additionalData,
) => `
	${task?.id ? `id: "${task.id}"` : ''}
	${
  user && approveOrFail
    ? `businessStatus: "{\\"${user.id}\\": \\"${approveOrFail}\\"}"`
    : ''
}
	${additionalData ? `additionalData: "${additionalData}"` : ''}
	`;

export function resolveTask(
  task,
  clientMutationLabel,
  user,
  approveOrFail,
  additionalData = null,
) {
  const mutationType = 'resolveTask';
  const mutationInput = formatTaskResolveGQL(
    task,
    user,
    approveOrFail,
    additionalData,
  );
  const mutation = formatMutation(
    mutationType,
    mutationInput,
    clientMutationLabel,
  );
  const requestedDateTime = new Date();

  const userId = user?.id;

  const mutation2 = prepareMutation(
    `mutation ($clientMutationLabel:String, $clientMutationId: String, $id:UUID!, 
		$businessStatus: JSONString!, ${
  additionalData ? '$additionalData: JSONString!' : ''
}
	  ) {
		resolveTask(
		input: {
		  clientMutationId: $clientMutationId
		  clientMutationLabel: $clientMutationLabel
	
		  id: $id
		  businessStatus: $businessStatus
		  ${additionalData ? 'additionalData: $additionalData' : ''}
				}
			  ) {
				clientMutationId
				internalId
			  }
			}`,
    {
      id: task?.id,
      businessStatus: (() => {
        if (!userId) return undefined;

        switch (approveOrFail) {
          case APPROVED:
          case FAILED:
            return JSON.stringify({ [userId]: approveOrFail });
          case ACCEPT:
          case REJECT:
            return JSON.stringify({
              [userId]: { [approveOrFail]: additionalData },
            });
          default:
            throw new Error('Invalid approveOrFail value');
        }
      })(),
      // eslint-disable-next-line max-len
      additionalData: additionalData
        ? JSON.stringify({ entries: additionalData, decision: additionalData })
        : undefined,
    },
    {
      id: task?.id,
      businessStatus: (() => {
        if (!userId) return undefined;

        switch (approveOrFail) {
          case APPROVED:
          case FAILED:
            return JSON.stringify({ [userId]: approveOrFail });
          case ACCEPT:
          case REJECT:
            return JSON.stringify({
              [userId]: { [approveOrFail]: additionalData },
            });
          default:
            throw new Error('Invalid approveOrFail value');
        }
      })(),
      // eslint-disable-next-line max-len
      additionalData: additionalData
        ? JSON.stringify({ entries: additionalData, decision: additionalData })
        : undefined,
    },
  );

  // eslint-disable-next-line no-param-reassign
  user.clientMutationId = mutation.clientMutationId;

  return graphqlWithVariables(
    mutation2.operation,
    {
      ...mutation2.variables.input,
    },
    [
      'TASK_MANAGEMENT_MUTATION_REQ',
      'TASK_MANAGEMENT_MUTATION_RESP',
      'TASK_MANAGEMENT_MUTATION_ERR',
    ],
    {
      requestedDateTime,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      userId: user.id,
    },
  );
}

export function confirmPullingDataFromApiEtl(
  nameOfService,
  clientMutationLabel,
  extraParams = {},
) {
  // For PAA-based ETL, new mutation
  if (extraParams.paaName && extraParams.districtCode) {
    let mutationInput = `paaName: "${extraParams.paaName}", districtCode: "${extraParams.districtCode}"`;

    if (extraParams.regionCode) {
      mutationInput += `, regionCode: "${extraParams.regionCode}"`;
    }
    if (extraParams.questionnaireId) {
      mutationInput += `, questionnaireId: "${extraParams.questionnaireId}"`;
    }
    if (extraParams.dryRun) {
      mutationInput += `, dryRun: ${extraParams.dryRun}`;
    }

    const mutation = formatMutation(
      'paaBasedEtl',
      mutationInput,
      clientMutationLabel,
    );
    const requestedDateTime = new Date();
    return graphql(
      mutation.payload,
      [
        REQUEST(ACTION_TYPE.PULL_API_DATA_PAA),
        SUCCESS(ACTION_TYPE.PULL_API_DATA_PAA),
        ERROR(ACTION_TYPE.PULL_API_DATA_PAA),
      ],
      {
        actionType: ACTION_TYPE.PULL_API_DATA_PAA,
        clientMutationId: mutation.clientMutationId,
        clientMutationLabel,
        requestedDateTime,
      },
    );
  }

  // Legacy ETL service mutation (backwards compatibility)
  let mutationInput = `nameOfService: "${nameOfService}"`;

  // Add location parameters if provided (legacy)
  if (extraParams.regionCode) {
    mutationInput += `, regionCode: "${extraParams.regionCode}"`;
  }
  if (extraParams.districtCode) {
    mutationInput += `, districtCode: "${extraParams.districtCode}"`;
  }
  if (extraParams.locationPrefix) {
    mutationInput += `, locationPrefix: "${extraParams.locationPrefix}"`;
  }

  const mutation = formatMutation(
    'etlServiceMutation',
    mutationInput,
    clientMutationLabel,
  );
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [
      REQUEST(ACTION_TYPE.PULL_API_DATA_LEGACY),
      SUCCESS(ACTION_TYPE.PULL_API_DATA_LEGACY),
      ERROR(ACTION_TYPE.PULL_API_DATA_LEGACY),
    ],
    {
      actionType: ACTION_TYPE.PULL_API_DATA_LEGACY,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
}

export function fetchMutationByLabel(clientMutationLabel) {
  const MUTATION_RECEIVED_STATUS = 0;
  const payload = formatPageQuery(
    'mutationLogs',
    [
      `clientMutationLabel: "${clientMutationLabel}", status: ${MUTATION_RECEIVED_STATUS}`,
    ],
    [
      'id',
      'status',
      'error',
      'clientMutationId',
      'clientMutationLabel',
      'clientMutationDetails',
      'requestDateTime',
      'jsonExt',
      'autogeneratedCode',
    ],
  );
  return graphql(payload, ACTION_TYPE.FETCH_ACTIVE_MUTATIONS);
}

export function downloadGroups(params) {
  const payload = `{groupExport${
    !!params && params.length ? `(${params.join(',')})` : ''
  }}`;
  alert(payload);
  return graphql(payload, ACTION_TYPE.GROUP_EXPORT);
}

export function downloadIndividuals(params) {
  const payload = `{individualExport${
    !!params && params.length ? `(${params.join(',')})` : ''
  }}`;
  return graphql(payload, ACTION_TYPE.INDIVIDUAL_EXPORT);
}

export function downloadGroupIndividuals(params) {
  const payload = `{groupIndividualExport${
    !!params && params.length ? `(${params.join(',')})` : ''
  }}`;
  return graphql(payload, ACTION_TYPE.GROUP_INDIVIDUAL_EXPORT);
}

export const setNewGroupIndividual = (groupIndividual) => (dispatch) => {
  dispatch({
    type: SET(ACTION_TYPE.SET_GROUP_INDIVIDUAL),
    payload: groupIndividual,
  });
};

export const clearGroupIndividualExport = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.GROUP_INDIVIDUAL_EXPORT),
  });
};

export const clearIndividualExport = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.INDIVIDUAL_EXPORT),
  });
};

export const clearGroupExport = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.GROUP_EXPORT),
  });
};

export const clearGroup = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.GET_GROUP),
  });
};

export const clearGroupIndividuals = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.SEARCH_GROUP_INDIVIDUALS),
  });
};

// ============ PMT (Poverty Management Tool) Actions ============
/**
 * Fetch households with PMT data for a district/region
 * @param {Object} modulesManager - Module manager instance
 * @param {Object} params - Query parameters
 */
export function fetchPmtHouseholds(modulesManager, params = {}) {
  const districtCode = params.districtCode || '';
  const regionCode = params.regionCode || '';
  const offset = params.offset || 0;
  const limit = params.limit || 10;
  const searchText = params.searchText || '';
  const pmtClass = params.pmtClass || '';

  const filterArgs = [`districtCode: "${districtCode}"`];

  if (regionCode) filterArgs.push(`regionCode: "${regionCode}"`);
  if (offset) filterArgs.push(`offset: ${offset}`);
  if (limit) filterArgs.push(`limit: ${limit}`);
  if (searchText) filterArgs.push(`searchText: "${searchText}"`);
  if (pmtClass) filterArgs.push(`pmtClass: "${pmtClass}"`);

  const payload = formatQuery(
    `pmtHouseholds(${filterArgs.join(', ')})`,
    [],
    [
      'households { groupUuid groupCode headUuid headName pmtScore pmtClass numberOfMembers locationCode locationName }',
      'totalCount',
      'hasNext',
      'hasPrevious',
      'offset',
      'limit',
    ],
  );

  return graphql(
    payload,
    [
      REQUEST(ACTION_TYPE.PMT_HOUSEHOLDS),
      SUCCESS(ACTION_TYPE.PMT_HOUSEHOLDS),
      ERROR(ACTION_TYPE.PMT_HOUSEHOLDS),
    ],
    {
      actionType: ACTION_TYPE.PMT_HOUSEHOLDS,
    },
  );
}

export function rerunPmt(modulesManager, districtCode, regionCode = null, pmtCutoff = 11.01) {
  const mutation = prepareMutation(
    `
      mutation (
        $clientMutationLabel: String
        $clientMutationId: String
        $districtCode: String!
        $pmtCutoff: Float!
        $regionCode: String
      ) {
        rerunPmt(
          input: {
            clientMutationId: $clientMutationId
            clientMutationLabel: $clientMutationLabel
            districtCode: $districtCode
            pmtCutoff: $pmtCutoff
            regionCode: $regionCode
          }
        ) {
          clientMutationId
          internalId
          ok
          errors
          updatedIndividuals
          updatedGroups
          mutationId
          districtCode
        }
      }
    `,
    {
      districtCode,
      pmtCutoff: parseFloat(pmtCutoff),
      regionCode: regionCode || null,
    },
  );

  return graphqlWithVariables(
    mutation.operation,
    { ...mutation.variables.input },
    [
      REQUEST(ACTION_TYPE.RERUN_PMT),
      SUCCESS(ACTION_TYPE.RERUN_PMT),
      ERROR(ACTION_TYPE.RERUN_PMT),
    ],
    {
      actionType: ACTION_TYPE.RERUN_PMT,
      clientMutationId: mutation.variables.input.clientMutationId,
      clientMutationLabel: mutation.variables.input.clientMutationLabel,
      requestedDateTime: new Date(),
    },
  );
}

/**
 * Clear PMT households state
 */
export const clearPmtHouseholds = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.PMT_HOUSEHOLDS),
  });
};

/**
 * Fetch PMT audit summary (aggregate statistics by district)
 * Returns: district name, pmtCutoff, poorCount, nonPoorCount for each district
 * @param {Object} modulesManager - Module manager instance
 * @param {Object} params - Query parameters (districtCode, regionCode optional)
 */
export function fetchPmtAuditSummary(modulesManager, params = {}) {
  const districtCode = params.districtCode || '';
  const regionCode = params.regionCode || '';
  const offset = params.offset || 0;
  const limit = params.limit || 10;

  const filterArgs = [];

  if (districtCode) filterArgs.push(`districtCode: "${districtCode}"`);
  if (regionCode) filterArgs.push(`regionCode: "${regionCode}"`);
  if (offset) filterArgs.push(`offset: ${offset}`);
  if (limit) filterArgs.push(`limit: ${limit}`);

  const payload = formatQuery(
    `pmtAuditSummary(${filterArgs.join(', ')})`,
    [],
    [
      'districts { districtCode districtName pmtCutoff poorCount nonPoorCount }',
      'totalCount',
      'hasNext',
      'hasPrevious',
      'offset',
      'limit',
    ],
  );

  return graphql(
    payload,
    [
      REQUEST(ACTION_TYPE.PMT_AUDIT_SUMMARY),
      SUCCESS(ACTION_TYPE.PMT_AUDIT_SUMMARY),
      ERROR(ACTION_TYPE.PMT_AUDIT_SUMMARY),
    ],
    {
      actionType: ACTION_TYPE.PMT_AUDIT_SUMMARY,
    },
  );
}

/**
 * Fetch enrollment list for a specific district with PMT cutoff
 * Handles filters from the Searcher component, including location UUIDs
 * Searcher can pass params as either an array of filter strings OR an object
 */
export function fetchPmtEnrollmentList(modulesManager, params = {}) {
  // Handle params being either an array or an object
  // Sometimes Searcher passes: ['filter1', 'filter2', ...]
  // Sometimes it passes: {filters: [...], pageInfo: {...}}
  let paramsObj = {};
  let filterStrings = [];

  if (Array.isArray(params)) {
    // Params is an array of filter strings like: ['parentLocation: "UUID"', 'first: 10', 'orderBy: ["code"]']
    filterStrings = params;
    // Extract pagination from filter strings
    filterStrings.forEach((str) => {
      if (str.includes('first:')) {
        const match = str.match(/first:\s*(\d+)/);
        if (match) paramsObj.first = parseInt(match[1], 10);
      }
      if (str.includes('offset:')) {
        const match = str.match(/offset:\s*(\d+)/);
        if (match) paramsObj.offset = parseInt(match[1], 10);
      }
    });
  } else {
    // Params is an object
    paramsObj = params;
    // Get filters from object
    if (paramsObj.filters) {
      const normalizeFilters = (f) => {
        if (!f) return [];
        if (Array.isArray(f)) return f.filter(Boolean);
        if (typeof f === 'object') {
          return Object.values(f)
            .map((x) => x?.filter)
            .filter(Boolean);
        }
        return [];
      };
      filterStrings = normalizeFilters(paramsObj.filters);
    }
  }

  // Get pagination info
  const pageSize = paramsObj.first || paramsObj.limit || 10;
  let offset = paramsObj.offset || 0;

  // Extract and convert location filters
  let processedFilters = [];
  let hasLocationFilter = false;

  // Helper function to map Searcher filter expressions to GraphQL parameters
  const mapFilterExpression = (filter) => {
    // Map search filters: headName_Icontains and code_Icontains both map to searchText
    if (filter.includes('headName_Icontains:')) {
      const match = filter.match(/"([^"]+)"/);
      return match ? `searchText: "${match[1]}"` : null;
    }
    if (filter.includes('code_Icontains:')) {
      const match = filter.match(/"([^"]+)"/);
      return match ? `searchText: "${match[1]}"` : null;
    }
    // PMT class filter: ensure value is quoted
    if (filter.includes('pmtClass:')) {
      const match = filter.match(/pmtClass:\s*(\w+)/);
      return match ? `pmtClass: "${match[1]}"` : filter;
    }
    return filter;
  };

  filterStrings.forEach((filter) => {
    // Skip pure pagination and ordering filters (but NOT mixed filters like "parentLocation: ..., parentLocationLevel: ...")
    if (filter.includes('orderBy:') || filter.includes('first:')) {
      return;
    }

    // Check if this is a location filter (parentLocation, location, etc)
    // Note: Filter might be combined like: "parentLocation: \"UUID\", parentLocationLevel: 2"
    if (filter.includes('parentLocation:') ||
        filter.includes('location:') ||
        filter.includes('regionLocation:') ||
        filter.includes('districtLocation:')) {
      // Extract location UUID and level from the filter string
      // Format: "parentLocation: \"UUID\", parentLocationLevel: N"
      const locationMatch = filter.match(/(parentLocation|location|regionLocation|districtLocation):\s*"([^"]+)"/);
      const levelMatch = filter.match(/parentLocationLevel:\s*(\d+)/);

      if (locationMatch) {
        const locationUUID = locationMatch[2];
        const locationLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1; // Default to district (level 1)

        // Use regionCode for level 0 (regions), districtCode for level 1+ (districts/wards/villages)
        if (locationLevel === 0) {
          processedFilters.push(`regionCode: "${locationUUID}"`);
        } else {
          processedFilters.push(`districtCode: "${locationUUID}"`);
        }
        hasLocationFilter = true;
      } else {
        // Fallback: just replace the location field name
        processedFilters.push(filter.replace(/\b(parentLocation|location|regionLocation|districtLocation):/g, 'districtCode:'));
        hasLocationFilter = true;
      }
    } else if (!filter.includes('parentLocationLevel:')) {
      // Map filter expression to valid GraphQL parameter, then add it
      const mappedFilter = mapFilterExpression(filter);
      if (mappedFilter) {
        processedFilters.push(mappedFilter);
      }
    }
  });

  if (paramsObj.districtCode) {
    processedFilters.push(`districtCode: "${paramsObj.districtCode}"`);
  }
  if (paramsObj.regionCode) {
    processedFilters.push(`regionCode: "${paramsObj.regionCode}"`);
  }
  if (paramsObj.searchText) {
    processedFilters.push(`searchText: "${paramsObj.searchText}"`);
  }
  if (paramsObj.pmtClass) {
    processedFilters.push(`pmtClass: "${paramsObj.pmtClass}"`);
  }

  // Always include pmtCutoff in the query
  const pmtCutoff = paramsObj.pmtCutoff || 11.01;
  const pmtCutoffFilter = `pmtCutoff: ${pmtCutoff}`;

  // Combine all filters
  const allFilters = [pmtCutoffFilter, ...new Set(processedFilters)];

  const graphqlQuery = `pmtEnrollmentList(${allFilters.join(', ')}, offset: ${offset}, limit: ${pageSize})`;

  const payload = formatQuery(
    graphqlQuery,
    [],
    [
      'households { groupUuid groupCode hhRep headUuid headName pmtScore pmtClass numberOfMembers locationCode locationName }',
      'totalCount',
      'hasNext',
      'hasPrevious',
      'offset',
      'limit',
    ],
  );

  return graphql(
    payload,
    [
      REQUEST(ACTION_TYPE.PMT_ENROLLMENT_LIST),
      SUCCESS(ACTION_TYPE.PMT_ENROLLMENT_LIST),
      ERROR(ACTION_TYPE.PMT_ENROLLMENT_LIST),
    ],
    {
      actionType: ACTION_TYPE.PMT_ENROLLMENT_LIST,
    },
  );
}

/**
 * Fetch ALL PMT enrollment records for export (bypasses pagination)
 * Uses same filter extraction as fetchPmtEnrollmentList but with very high limit
 */
export function fetchPmtEnrollmentListForExport(modulesManager, params = {}) {
  // Handle params being either an array or an object
  let paramsObj = {};
  let filterStrings = [];

  if (Array.isArray(params)) {
    filterStrings = params;
  } else {
    paramsObj = params;
    if (paramsObj.filters) {
      const normalizeFilters = (f) => {
        if (!f) return [];
        if (Array.isArray(f)) return f.filter(Boolean);
        if (typeof f === 'object') {
          return Object.values(f)
            .map((x) => x?.filter)
            .filter(Boolean);
        }
        return [];
      };
      filterStrings = normalizeFilters(paramsObj.filters);
    }
  }

  // Extract and convert location filters
  let processedFilters = [];

  // Helper function to map Searcher filter expressions to GraphQL parameters
  const mapFilterExpression = (filter) => {
    if (filter.includes('headName_Icontains:')) {
      const match = filter.match(/"([^"]+)"/);
      return match ? `searchText: "${match[1]}"` : null;
    }
    if (filter.includes('code_Icontains:')) {
      const match = filter.match(/"([^"]+)"/);
      return match ? `searchText: "${match[1]}"` : null;
    }
    if (filter.includes('pmtClass:')) {
      const match = filter.match(/pmtClass:\s*(\w+)/);
      return match ? `pmtClass: "${match[1]}"` : filter;
    }
    return filter;
  };

  filterStrings.forEach((filter) => {
    if (filter.includes('orderBy:') || filter.includes('first:')) {
      return;
    }

    if (filter.includes('parentLocation:') ||
        filter.includes('location:') ||
        filter.includes('regionLocation:') ||
        filter.includes('districtLocation:')) {
      const locationMatch = filter.match(/(parentLocation|location|regionLocation|districtLocation):\s*"([^"]+)"/);
      const levelMatch = filter.match(/parentLocationLevel:\s*(\d+)/);

      if (locationMatch) {
        const locationUUID = locationMatch[2];
        const locationLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1;

        if (locationLevel === 0) {
          processedFilters.push(`regionCode: "${locationUUID}"`);
        } else {
          processedFilters.push(`districtCode: "${locationUUID}"`);
        }
      } else {
        processedFilters.push(filter.replace(/\b(parentLocation|location|regionLocation|districtLocation):/g, 'districtCode:'));
      }
    } else if (!filter.includes('parentLocationLevel:')) {
      const mappedFilter = mapFilterExpression(filter);
      if (mappedFilter) {
        processedFilters.push(mappedFilter);
      }
    }
  });

  if (paramsObj.districtCode) {
    processedFilters.push(`districtCode: "${paramsObj.districtCode}"`);
  }
  if (paramsObj.regionCode) {
    processedFilters.push(`regionCode: "${paramsObj.regionCode}"`);
  }
  if (paramsObj.searchText) {
    processedFilters.push(`searchText: "${paramsObj.searchText}"`);
  }
  if (paramsObj.pmtClass) {
    processedFilters.push(`pmtClass: "${paramsObj.pmtClass}"`);
  }

  // Always include pmtCutoff in the query
  const pmtCutoff = paramsObj.pmtCutoff || 11.01;
  const pmtCutoffFilter = `pmtCutoff: ${pmtCutoff}`;

  // Combine all filters with NO LIMIT for export
  const allFilters = [pmtCutoffFilter, ...new Set(processedFilters)];

  // Use very high offset/limit to get all records (set limit to 10000 to cover almost all cases)
  const graphqlQuery = `pmtEnrollmentList(${allFilters.join(', ')}, offset: 0, limit: 10000)`;

  const payload = formatQuery(
    graphqlQuery,
    [],
    [
      'households { groupUuid groupCode hhRep headUuid headName pmtScore pmtClass numberOfMembers locationCode locationName }',
      'totalCount',
      'hasNext',
      'hasPrevious',
      'offset',
      'limit',
    ],
  );

  return graphql(
    payload,
    [
      REQUEST(ACTION_TYPE.PMT_ENROLLMENT_LIST),
      SUCCESS(ACTION_TYPE.PMT_ENROLLMENT_LIST),
      ERROR(ACTION_TYPE.PMT_ENROLLMENT_LIST),
    ],
    {
      actionType: ACTION_TYPE.PMT_ENROLLMENT_LIST,
    },
  );
}

/**
 * Clear PMT enrollment list state
 */
export const clearPmtEnrollmentList = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.PMT_ENROLLMENT_LIST),
  });
};

export function fetchPmtRunProgress(mutationId) {
  const query = `
    query PmtRunProgress($mutationId: UUID!) {
      pmtRunProgress(mutationId: $mutationId) {
        mutationId
        status
        districtCode
        totalGroups
        processedGroups
        totalIndividuals
        processedIndividuals
        poorGroupsFound
        enrollmentsCreated
        percentageComplete
        statusMessage
        errors
        startedAt
        completedAt
      }
    }
  `;

  return graphqlWithVariables(
    query,
    { mutationId },
    [
      REQUEST(ACTION_TYPE.PMT_RUN_PROGRESS),
      SUCCESS(ACTION_TYPE.PMT_RUN_PROGRESS),
      ERROR(ACTION_TYPE.PMT_RUN_PROGRESS),
    ],
    { actionType: ACTION_TYPE.PMT_RUN_PROGRESS },
  );
}
