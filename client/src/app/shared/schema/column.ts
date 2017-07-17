import { Project } from '../project'
import { ProjectResource } from '../resource'
import { ColumnDescription, TableDescription } from './schema.description'

/**
 * Enum to set the status of a column 
 */
export enum ColumnStatus {
  new = 1,
  changed = 2,
  deleted = 3,
  unchanged = 4
}

/**
 * Class to implement a column of a table
 */
export class Column {
  index: number
  name: string
  type: string
  not_null: boolean
  dflt_value?: string
  primary: boolean
  state: ColumnStatus

  constructor(desc: ColumnDescription, state: ColumnStatus) {
    this.index = desc.index;
    this.name = desc.name;
    this.type = desc.type;
    this.not_null = desc.not_null;
    this.dflt_value = desc.dflt_value;
    this.primary = desc.primary;
    this.state = state;
  }

  /**
   * Getter to get the status of the column as a string
   */
  get stateName() {
    if (this.state == ColumnStatus.changed) {
      return ("changed");
    } else if (this.state == ColumnStatus.unchanged) {
      return ("unchanged");
    } else if (this.state == ColumnStatus.new) {
      return ("new");
    } else if (this.state == ColumnStatus.deleted) {
      return ("deleted");
    }
    return ("undefined");
  }

  toModel(): ColumnDescription {
    return {
      index: this.index,
      name: this.name,
      primary: this.primary,
      type: this.type,
      not_null: this.not_null,
      dflt_value: this.dflt_value
    }
  }
}
