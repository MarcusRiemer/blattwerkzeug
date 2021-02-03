import { TestBed } from "@angular/core/testing";

import { ProjectService } from "../project.service";

import {
  FullProjectDocument,
  FullProjectQuery,
} from "../../../generated/graphql";

import { ProjectFullDescription, Project } from "../../shared/project";
import { generateUUIDv4 } from "../../shared/util-browser";
import { ApolloTestingController } from "apollo-angular/testing";
import { GraphQLError } from "graphql";

type FullProjectNode = FullProjectQuery["projects"]["nodes"][0];

type FullProjectGQLResponse =
  | { data: FullProjectQuery }
  | { errors: ReadonlyArray<GraphQLError> };

const DEFAULT_EMPTY_PROJECT: ProjectFullDescription = {
  id: "28066939-7d53-40de-a89b-95bf37c982be",
  blockLanguages: [],
  codeResources: [],
  description: { en: "Default Empty Project" },
  grammars: [],
  name: { en: "Project" },
  projectSources: [],
  projectUsesBlockLanguages: [],
  defaultDatabase: {
    id: "4861f7ad-53c6-481f-b4a7-2b19aeffb021",
    name: "specDb",
    schema: [],
  },
  public: false,
  indexPageId: null,
  slug: null,
};

const wrapProjectData = (data: FullProjectNode[]): FullProjectGQLResponse => {
  return {
    data: {
      projects: {
        nodes: data,
      },
    },
  };
};

export const specLoadProject = (
  projectService: ProjectService,
  override?: Partial<ProjectFullDescription>
): Promise<Project> => {
  const testingController = TestBed.inject(ApolloTestingController);

  const id = override?.id ?? generateUUIDv4();
  const p = Object.assign({}, DEFAULT_EMPTY_PROJECT, override || {}, { id });

  const toReturn = projectService.setActiveProject(p.id, true);
  const wrappedData = wrapProjectData([p]);

  testingController
    .expectOne(
      (op) => op.query === FullProjectDocument && op.variables.id === p.id
    )
    .flush(wrappedData);

  testingController.verify();

  return toReturn;
};
