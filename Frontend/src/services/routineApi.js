import { apiClient } from './apiClient.js';


export const routineApi = {
  list: () => apiClient.get('/academics/routines/'),

  create: routine => apiClient.post('/academics/routines/', routine),

  update: (id, routine) => apiClient.patch(
    `/academics/routines/${encodeURIComponent(id)}/`,
    routine
  ),

  delete: id => apiClient.delete(
    `/academics/routines/${encodeURIComponent(id)}/`
  ),

  importImage: (file, options = {}) => {
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('subgroup', options.subgroup || '');
    body.append(
      'replaceExistingImports',
      options.replaceExistingImports === false ? 'false' : 'true'
    );
    return apiClient.upload('/academics/routines/import-image/', body, {
      signal: options.signal,
      timeout: 180_000
    });
  },

  getCalendarStatus: () => apiClient.get('/academics/calendar/status/'),

  syncCalendar: (data = {}) => apiClient.post('/academics/calendar/sync/', data),

  clearAll: () => apiClient.delete('/academics/routines/clear/')
};

export default routineApi;
