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
    const isSynthetic = id && String(id).startsWith('course-');
    const primaryKey = isSynthetic && courseCode ? courseCode : (id || courseCode);
    const fallbackKey = primaryKey === id ? courseCode : id;
    const queryParam = courseCode ? `?courseId=${encodeURIComponent(courseCode)}` : '';

    try {
      return await apiClient.delete(
        `/academics/courses/${encodeURIComponent(primaryKey)}/${queryParam}`,
        courseCode ? { courseId: courseCode } : undefined
      );
    } catch (err) {
      if (fallbackKey && String(fallbackKey) !== String(primaryKey)) {
        try {
          return await apiClient.delete(
            `/academics/courses/${encodeURIComponent(fallbackKey)}/${queryParam}`,
            courseCode ? { courseId: courseCode } : undefined
          );
        } catch (innerErr) {
          if (innerErr?.status === 404) return null;
        }
      }
      if (err?.status === 404) return null;
      throw err;
    }
  },

  syncWithRoutine: (payload = {}) => apiClient.post('/academics/courses/sync-routine/', payload),

  deleteAll: (mode = 'all') => apiClient.delete(`/academics/courses/?mode=${encodeURIComponent(mode)}`)
};

export default courseApi;
