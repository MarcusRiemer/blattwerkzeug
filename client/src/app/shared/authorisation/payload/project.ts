import { MayPerformRequestDescription } from "../may-perform.description";
import { ResourcesData } from "./resources";
export class ProjectPerformData extends ResourcesData {
  constructor() {
    super("Project");
  }

  public storeSeed(resourceId: string): MayPerformRequestDescription {
    return {
      resourceType: this.resourceType,
      resourceId: resourceId,
      policyAction: "store_seed",
    };
  }

  public addMember(resourceId: string): MayPerformRequestDescription {
    return {
      resourceType: this.resourceType,
      resourceId: resourceId,
      policyAction: "add_member",
    };
  }

  public changeMemberRole(resourceId: string): MayPerformRequestDescription {
    return {
      resourceType: this.resourceType,
      resourceId: resourceId,
      policyAction: "change_member_role",
    };
  }

  public changeOwner(resourceId: string): MayPerformRequestDescription {
    return {
      resourceType: this.resourceType,
      resourceId: resourceId,
      policyAction: "change_owner",
    };
  }

  public removeMember(resourceId: string): MayPerformRequestDescription {
    return {
      resourceType: this.resourceType,
      resourceId: resourceId,
      policyAction: "remove_member",
    };
  }

  public educational(resourceId: string): MayPerformRequestDescription {
    return {
      resourceType: this.resourceType,
      resourceId: resourceId,
      policyAction: "educational",
    };
  }
}
