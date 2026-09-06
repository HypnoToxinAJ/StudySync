import { apiClient } from './apiClient.js';

export const courseApi = {
  list: () => apiClient.get('/academics/courses/'),

  get: (id) => apiClient.get(`/academics/courses/${encodeURIComponent(id)}/`),

  create: (course) => apiClient.post('/academics/courses/', course),

  update: async (id, course) => {
    try {
      return await apiClient.patch(
        `/academics/courses/${encodeURIComponent(id)}/`,
        course
      );
    } catch (err) {
      const code = course?.courseId || course?.course_id;
      if (err?.status === 404 && code && String(code) !== String(id)) {
        try {
          return await apiClient.patch(
            `/academics/courses/${encodeURIComponent(code)}/`,
            course
          );
        } catch (innerErr) {
          if (innerErr?.status === 404) {
            return await apiClient.post('/academics/courses/', { ...course, id });
          }
          throw innerErr;
        }
      } else if (err?.status === 404) {
        return await apiClient.post('/academics/courses/', { ...course, id });
      }
      throw err;
    }
  },

  delete: async (id, courseCode = null) => {
    try {
      return await apiClient.delete(
        `/academics/courses/${encodeURIComponent(id)}/`
      );
    } catch (err) {
      if (err?.status === 404 && courseCode && String(courseCode) !== String(id)) {
        try {
          return await apiClient.delete(
            `/academics/courses/${encodeURIComponent(courseCode)}/`
          );
        } catch {
          // Ignored if already removed
        }
      }
      throw err;
    }
  }
};

export default courseApi;
