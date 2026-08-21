import { storageService } from './storageService';

export const cgpaService = {
  getSemesters: () => {
    // If official CUET results are imported, return normalized CUET semesters
    const cuetResults = storageService.get(storageService.KEYS.CUET_RESULTS, null);
    if (cuetResults && cuetResults.semesters && cuetResults.semesters.length > 0) {
      return cuetResults.semesters;
    }
    return storageService.get(storageService.KEYS.SEMESTERS, []);
  },

  saveSemesters: (semesters) => {
    storageService.set(storageService.KEYS.SEMESTERS, semesters);
  },

  addSemester: (name) => {
    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    const newSem = {
      id: `sem-${Date.now()}`,
      name: name || `Semester ${semesters.length + 1}`,
      completed: true,
      courses: []
    };
    semesters.push(newSem);
    cgpaService.saveSemesters(semesters);
    return newSem;
  },

  updateSemesterName: (id, name) => {
    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    const index = semesters.findIndex(s => s.id === id);
    if (index !== -1) {
      semesters[index].name = name;
      cgpaService.saveSemesters(semesters);
    }
  },

  deleteSemester: (id) => {
    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    const filtered = semesters.filter(s => s.id !== id);
    cgpaService.saveSemesters(filtered);
    return filtered;
  },

  addCourseToSemester: (semesterId, courseData) => {
    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    const index = semesters.findIndex(s => s.id === semesterId);
    if (index !== -1) {
      const newCourse = {
        id: `sem-c-${Date.now()}`,
        ...courseData
      };
      semesters[index].courses.push(newCourse);
      cgpaService.saveSemesters(semesters);
      return newCourse;
    }
    return null;
  },

  updateCourseInSemester: (semesterId, courseId, updatedData) => {
    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    const sIndex = semesters.findIndex(s => s.id === semesterId);
    if (sIndex !== -1) {
      const cIndex = semesters[sIndex].courses.findIndex(c => c.id === courseId);
      if (cIndex !== -1) {
        semesters[sIndex].courses[cIndex] = { ...semesters[sIndex].courses[cIndex], ...updatedData };
        cgpaService.saveSemesters(semesters);
      }
    }
  },

  deleteCourseFromSemester: (semesterId, courseId) => {
    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    const sIndex = semesters.findIndex(s => s.id === semesterId);
    if (sIndex !== -1) {
      semesters[sIndex].courses = semesters[sIndex].courses.filter(c => c.id !== courseId);
      cgpaService.saveSemesters(semesters);
    }
  },

  // Semester GPA Calculation: sum(credit * gradePoint) / sum(credits)
  calculateSemesterGPA: (semester) => {
    const courses = semester.courses || [];
    let totalQualityPoints = 0;
    let totalCredits = 0;

    courses.forEach(c => {
      const credit = Number(c.credit || 0);
      const gp = Number(c.gradePoint || 0);
      if (c.letterGrade !== 'F') {
        totalQualityPoints += credit * gp;
        totalCredits += credit;
      }
    });

    const gpa = totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : "0.00";
    return {
      gpa: Number(gpa),
      totalQualityPoints,
      totalCredits
    };
  },

  // Overall CGPA across all completed semesters
  calculateOverallCGPA: () => {
    // Check if official CUET results are active
    const cuetResults = storageService.get(storageService.KEYS.CUET_RESULTS, null);
    if (cuetResults && cuetResults.overall && cuetResults.semesters) {
      const trendData = cuetResults.semesters.map((sem, idx) => ({
        name: sem.name.replace('Level ', 'L').replace(' - Term ', 'T'),
        fullName: sem.name,
        gpa: Number(sem.gpa || sem.calculatedGpa || 0),
        credits: Number(sem.completedCredits || 0),
        index: idx + 1
      }));

      return {
        cgpa: Number(cuetResults.overall.cgpa || cuetResults.overall.calculatedCgpa || 0),
        totalQualityPoints: Number(cuetResults.overall.qualityPoints || 0),
        totalCredits: Number(cuetResults.overall.completedCredits || 0),
        highestGPA: Number(cuetResults.overall.highestGpa || 0),
        semesterCount: cuetResults.semesters.length,
        trendData
      };
    }

    const semesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    let totalQualityPoints = 0;
    let totalCredits = 0;
    let highestGPA = 0;
    const trendData = [];

    semesters.forEach((sem, idx) => {
      if (sem.completed) {
        const stats = cgpaService.calculateSemesterGPA(sem);
        totalQualityPoints += stats.totalQualityPoints;
        totalCredits += stats.totalCredits;
        if (stats.gpa > highestGPA) highestGPA = stats.gpa;

        trendData.push({
          name: sem.name,
          gpa: stats.gpa,
          credits: stats.totalCredits,
          index: idx + 1
        });
      }
    });

    const cgpa = totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : "0.00";

    return {
      cgpa: Number(cgpa),
      totalQualityPoints,
      totalCredits,
      highestGPA,
      semesterCount: trendData.length,
      trendData
    };
  },

  // Next-Semester Target CGPA Calculator
  // Required GPA = ((desired CGPA * (current credits + next credits)) - (current CGPA * current credits)) / next credits
  calculateTargetGPA: (desiredCGPA, nextSemesterCredits) => {
    const { cgpa: currentCGPA, totalCredits: currentCredits } = cgpaService.calculateOverallCGPA();
    const target = Number(desiredCGPA || 3.80);
    const nextCredits = Number(nextSemesterCredits || 18);

    if (nextCredits <= 0) return { requiredGPA: 0, isFeasible: false, message: "Next semester credits must be greater than 0." };

    const totalCreditsAfterNext = currentCredits + nextCredits;
    const requiredTotalPoints = target * totalCreditsAfterNext;
    const currentPoints = currentCGPA * currentCredits;
    const requiredNextPoints = requiredTotalPoints - currentPoints;
    const requiredGPA = requiredNextPoints / nextCredits;

    const maxReachableCGPA = Number(((currentPoints + (4.00 * nextCredits)) / totalCreditsAfterNext).toFixed(2));

    let isFeasible = true;
    let message = `You need a GPA of ${requiredGPA.toFixed(2)} in your next semester.`;

    if (requiredGPA > 4.00) {
      isFeasible = false;
      message = `Impossible! Even with a perfect 4.00 GPA next semester, your maximum reachable CGPA will be ${maxReachableCGPA}. Consider adjusting your target.`;
    } else if (requiredGPA < 0) {
      isFeasible = true;
      message = `Your target CGPA of ${target.toFixed(2)} is already achieved! You need a GPA of 0.00+ next semester.`;
    }

    return {
      currentCGPA,
      currentCredits,
      nextCredits,
      desiredCGPA: target,
      requiredGPA: Number(requiredGPA.toFixed(2)),
      maxReachableCGPA,
      isFeasible,
      message
    };
  }
};
