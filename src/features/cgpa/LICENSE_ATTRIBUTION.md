# License & Attribution Notice

## Reference Implementation
This feature incorporates and adapts result-fetching, HTML parsing, repeated-course resolution, and CGPA calculation algorithms from:
- **Repository**: [CUET_Result_Viewer](https://github.com/TheSR007/CUET_Result_Viewer)
- **Author**: TheSR007
- **Original License**: Apache License, Version 2.0 (Apache-2.0)
- **Reference Path**: `Website/script.js` & `Chrome Extension/content.js`

---

## Apache License 2.0 Notice

```
Copyright 2024 TheSR007

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Adapted & Reused Logic Documentation

1. **CUET Grade Point Scale**:
   - Official 4.00 grading scale mapping:
     - `A+` -> 4.00
     - `A` -> 3.75
     - `A-` -> 3.50
     - `B+` -> 3.25
     - `B` -> 3.00
     - `B-` -> 2.75
     - `C+` -> 2.50
     - `C` -> 2.25
     - `D` -> 2.00
     - `F` -> 0.00

2. **Repeated Course Handling & Resolution Algorithm**:
   - **First Pass**: Traverse all parsed course records across terms and collect the latest/effective grade obtained for each unique course code.
   - **Second Pass**: When accumulating earned credits and quality points towards term GPA and overall CGPA, only effective passing grades are counted. Earlier superseded attempts are identified as repeated attempts, preventing double counting of course credit weight while preserving academic attempt history.

3. **Failed Course Tracking**:
   - Courses with grade `F` (0.00) are flagged. If not cleared in subsequent terms, they are isolated in the uncleared failed subjects tracking summary.

4. **Visual Design & UI Architecture**:
   - All user interfaces, React components, Tailwind CSS styling, glassmorphism cards, and Recharts analytics are original StudySync designs and do **not** copy the visual styling of the reference project.
