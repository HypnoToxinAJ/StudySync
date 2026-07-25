import { storageService } from './storageService';

export const authService = {
  // Mock login with email/username & password
  login: async (emailOrUsername, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = storageService.get(storageService.KEYS.USER, null);
        const authenticatedUser = {
          ...user,
          name: user?.name || 'Tanvir Ahmed',
          email: emailOrUsername || user?.email || 'tanvir.student@university.edu.bd',
          isLoggedIn: true,
          onboarded: true,
          lastLogin: new Date().toISOString()
        };
        storageService.set(storageService.KEYS.USER, authenticatedUser);
        resolve(authenticatedUser);
      }, 100);
    });
  },

  // Mock registration
  register: async (userData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser = {
          name: userData.name || 'New Student',
          email: userData.email,
          username: userData.email.split('@')[0],
          university: userData.university || 'General University',
          department: userData.department || 'Computer Science',
          semester: userData.semester || '1st Semester',
          studentId: userData.studentId || '2026001',
          currency: userData.currency || 'BDT',
          themePreference: 'dark',
          weeklyClassDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          academicGoals: userData.academicGoals || '',
          onboarded: false, // Trigger onboarding wizard
          isLoggedIn: true
        };
        storageService.set(storageService.KEYS.USER, newUser);
        resolve(newUser);
      }, 600);
    });
  },

  // Google Login mock
  loginWithGoogle: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const googleUser = {
          name: "Alex Vance",
          email: "alex.vance@gmail.com",
          username: "alex_vance",
          university: "University of Engineering & Tech",
          department: "Computer Science",
          semester: "4th Semester",
          studentId: "2024991",
          currency: "BDT",
          themePreference: "dark",
          weeklyClassDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          onboarded: true,
          isLoggedIn: true
        };
        storageService.set(storageService.KEYS.USER, googleUser);
        resolve(googleUser);
      }, 600);
    });
  },

  // Update onboarding parameters
  completeOnboarding: async (onboardingData) => {
    const user = storageService.get(storageService.KEYS.USER, {});
    const updatedUser = {
      ...user,
      ...onboardingData,
      onboarded: true
    };
    storageService.set(storageService.KEYS.USER, updatedUser);
    return updatedUser;
  },

  // Mock forgot password
  forgotPassword: async (email) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: `Password reset link has been dispatched to ${email}` });
      }, 500);
    });
  },

  // Logout
  logout: () => {
    const user = storageService.get(storageService.KEYS.USER, {});
    storageService.set(storageService.KEYS.USER, { ...user, isLoggedIn: false });
  },

  getCurrentUser: () => {
    return storageService.get(storageService.KEYS.USER, null);
  }
};
