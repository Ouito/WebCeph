import env from './env';
import workspace from './workspace';

import {
  isAppUpdating,
  isAppInstalling,
  isAppInstalled,
  isAppUpdated,
} from './app';

const reducers: ReducerMap = {
  ...workspace,
  ...env,
};

import { createStructuredSelector } from 'reselect';

export const getNotificationMessages = createStructuredSelector({
  isAppUpdating,
  isAppInstalling,
  isAppInstalled,
  isAppUpdated,
});


export default reducers;
