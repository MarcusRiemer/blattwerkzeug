import { Component } from "@angular/core";
import { Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

import { MultiLangString } from "../../../shared/multilingual-string.description";
import { CourseService } from "../course.service";

interface participantCourseInfos {
  name: MultiLangString;
  description: MultiLangString;
  assignments: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    grade?: number;
    requiredCodeResource: {
      id: string;
      submittion: boolean;
    };
  }[];
}

@Component({
  selector: "overview-course-participant",
  templateUrl: "./overview-single-course-participant.component.html",
})
export class OverviewSingelCourseParticipantComponent {
  constructor(private readonly _courseService: CourseService) {}

  course$: Observable<participantCourseInfos> =
    this._courseService.fullCourseData$.pipe(
      map((course) => {
        const toReturn: participantCourseInfos = {
          name: course.basedOnProject.name,
          description: course.basedOnProject.description,
          assignments: course.basedOnProject.assignments.map((assignment) => ({
            ...assignment,
            requiredCodeResource: null,
            grade: course?.assignmentSubmissions.find(
              (sub) => sub?.assignment?.id == assignment.id
            )?.assignmentSubmissionGradeParticipant?.grade,
          })),
        };
        return toReturn;
      }),
      tap(console.log)
    );
}
