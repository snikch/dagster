import {gql, useQuery} from '@apollo/client';
import {Page, Alert, ButtonLink, Colors, Group} from '@dagster-io/ui';
import * as React from 'react';

import {showCustomAlert} from '../app/CustomAlertProvider';
import {useFeatureFlags} from '../app/Flags';
import {PYTHON_ERROR_FRAGMENT} from '../app/PythonErrorFragment';
import {FIFTEEN_SECONDS, useQueryRefreshAtInterval} from '../app/QueryRefresh';
import {useTrackPageView} from '../app/analytics';
import {useDocumentTitle} from '../hooks/useDocumentTitle';
import {INSTANCE_HEALTH_FRAGMENT} from '../instance/InstanceHealthFragment';
import {SchedulerInfo} from '../schedules/SchedulerInfo';
import {
  REPOSITORY_FOR_NEXT_TICKS_FRAGMENT,
  SchedulesNextTicks,
} from '../schedules/SchedulesNextTicks';
import {Loading} from '../ui/Loading';

import {RunsPageHeader} from './RunsPageHeader';
import {ScheduledRunListRoot as ScheduledRunListRootNew} from './ScheduledRunsListRoot.new';
import {
  ScheduledRunsListQuery,
  ScheduledRunsListQueryVariables,
} from './types/ScheduledRunListRoot.types';

export const ScheduledRunListRoot = () => {
  const {flagRunsTableFiltering} = useFeatureFlags();
  return flagRunsTableFiltering ? <ScheduledRunListRootNew /> : <ScheduledRunListRootImpl />;
};

export const ScheduledRunListRootImpl = () => {
  useTrackPageView();
  useDocumentTitle('Runs | Scheduled');

  const queryResult = useQuery<ScheduledRunsListQuery, ScheduledRunsListQueryVariables>(
    SCHEDULED_RUNS_LIST_QUERY,
    {
      partialRefetch: true,
      notifyOnNetworkStatusChange: true,
    },
  );

  const refreshState = useQueryRefreshAtInterval(queryResult, FIFTEEN_SECONDS);

  return (
    <Page>
      <RunsPageHeader refreshStates={[refreshState]} />
      <Loading queryResult={queryResult}>
        {(result) => {
          const {repositoriesOrError, instance} = result;
          if (repositoriesOrError.__typename === 'PythonError') {
            const message = repositoriesOrError.message;
            return (
              <Alert
                intent="warning"
                title={
                  <Group direction="row" spacing={4}>
                    <div>Could not load scheduled ticks.</div>
                    <ButtonLink
                      color={Colors.Link}
                      underline="always"
                      onClick={() => {
                        showCustomAlert({
                          title: 'Python error',
                          body: message,
                        });
                      }}
                    >
                      View error
                    </ButtonLink>
                  </Group>
                }
              />
            );
          }
          return (
            <>
              <SchedulerInfo
                daemonHealth={instance.daemonHealth}
                padding={{vertical: 16, horizontal: 24}}
              />
              <SchedulesNextTicks repos={repositoriesOrError.nodes} />
            </>
          );
        }}
      </Loading>
    </Page>
  );
};

// Imported via React.lazy, which requires a default export.
// eslint-disable-next-line import/no-default-export
export default ScheduledRunListRoot;

const SCHEDULED_RUNS_LIST_QUERY = gql`
  query ScheduledRunsListQuery {
    instance {
      id
      ...InstanceHealthFragment
    }
    repositoriesOrError {
      ... on RepositoryConnection {
        nodes {
          id
          ... on Repository {
            id
            ...RepositoryForNextTicksFragment
          }
        }
      }
      ...PythonErrorFragment
    }
  }

  ${INSTANCE_HEALTH_FRAGMENT}
  ${REPOSITORY_FOR_NEXT_TICKS_FRAGMENT}
  ${PYTHON_ERROR_FRAGMENT}
`;
