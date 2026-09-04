import { apiClient } from './apiClient.js';

export const courseApi = {
  list: () => apiClient.get('/academics/courses/'),

  get: (id) => apiClient.get(`/academics/courses/${encodeURIComponent(id)}/`),

  create: (course) => apiClient.post('/academics/courses/', course),

  update: (id, course) => apiClient.patch(
    `/academics/courses/${encodeURIComponent(id)}/`,
    course
  ),

  delete: (id) => apiClient.delete(
    `/academics/courses/${encodeURIComponent(id)}/`
  )
};

export default courseApi;
