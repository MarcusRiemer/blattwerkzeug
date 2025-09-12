import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from "@angular/core";

/**
 * Allows more or less comfortable editing of JSON data
 */
@Component({
  templateUrl: "templates/json-editor.html",
  selector: "json-editor",
})
export class JsonEditor implements OnInit, OnChanges {
  @Input() jsonValue: any;
  @Output() jsonValueChange = new EventEmitter<any>();

  public isSynchronised = true;

  public errorText: string | null = null;

  // This string is bound to the editor. It is initialized once, any further
  // updates requires explicit consent from the user as that would mean to
  // overwrite the current state of the editor.
  public jsonString = "";

  // This is the "live" version of the text. It should always be exactly
  // as represented in the editor.
  public currentText: string;

  ngOnInit(): void {
    this.onUiOverwriteEditor();
  }

  /**
   *
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes.jsonValue && !changes.jsonValue.firstChange) {
      this.checkSynchronisation();
    }
  }

  /**
   * The user has changed the text. We emit it if it appears to be valid
   * JSON data.
   */
  onTextChanged(event: InputEvent) {
    const newText = (event.target as HTMLTextAreaElement).value;
    this.currentText = newText;

    // An empty string trumps everything else: No matter how identical
    // the new state is, we want the empty state.
    if (newText === "" || this.isSynchronised) {
      this.onEditorOverwriteUi();
    }
  }

  /**
   * Take the external state and make it our state.
   */
  onUiOverwriteEditor() {
    this.jsonString = JSON.stringify(this.jsonValue, undefined, 4);
    this.currentText = this.jsonString;
    this.checkSynchronisation();
  }

  /**
   * Take the internal state and force it onto the external state
   */
  onEditorOverwriteUi() {
    try {
      // JSON.parse("") or JSON.parse(undefined) results in an exception
      this.jsonValue =
        this.currentText !== "" ? JSON.parse(this.currentText) : undefined;
      this.jsonValueChange.emit(this.jsonValue);
      this.checkSynchronisation();
      this.errorText = null;
    } catch (e) {
      // This is (hopefully) something that happened during JSON.parse.
      this.errorText = e.message;
    }
  }

  private checkSynchronisation() {
    if (!this.currentText && this.jsonValue === undefined) {
      this.isSynchronised = true;
    } else {
      const ourValue = JSON.stringify(JSON.parse(this.currentText || null));
      const theirValue = JSON.stringify(this.jsonValue);
      this.isSynchronised = ourValue === theirValue;
    }
  }
}
