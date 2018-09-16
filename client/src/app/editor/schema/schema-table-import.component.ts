import { Component, OnInit } from '@angular/core';
import * as Parser from '../../shared/csv-parser';

/**
 * Displays the schema for a list of tables.
 */
@Component({
  templateUrl: 'templates/schema-table-import.html',
  selector: "sql-table-import"
})
export class SchemaTableImportComponent implements OnInit {
  // File Object as a string
  fileData: any;

  parse: Parser.CsvParseResult | Parser.CsvParseError;
  errors: Parser.ValidationError[];

  header: string[];
  table: string[][];
  headlineUsage: "file" | "own"
  headerLength: number;

  // Contains all currently used Delimiters
  currentDelimiters: string[];
  // Contains all possible Markers
  markers: string[];
  selectedMarker: string;

  disableSelection: boolean;
  disableHeadlineSelection: boolean;

  
  constructor() {

  }

  ngOnInit() {
    this.markers = ['"', "'"];
    this.selectedMarker = this.markers[0];

    this.currentDelimiters = [];
    this.toggleDelimiter(',');

    this.headlineUsage = "file";
    this.disableSelection = true;
    this.disableHeadlineSelection = true;
  }


  changeListener(event): void {
    this.handleDataUpload(event.target);    
  }

  readUploadedFileAsText = (inputFile) => {
    const temporaryFileReader = new FileReader();
  
    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      };
  
      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result);   
      };
      temporaryFileReader.readAsText(inputFile);
      
    });
  };

  handleDataUpload = async(event) => {
    const file = event.files[0];
  
    try {
      // Wait until the File is read
      this.fileData = await this.readUploadedFileAsText(file);
      this.parseProcess();
      
    } catch(e) {
      console.warn(e.message)
    }
  }

  parseProcess = () => {
    this.parse = Parser.convertCSVStringToArray(this.fileData, this.currentDelimiters, this.selectedMarker);
    
    if (this.parse.type === 'parseResult') {   
      this.header = (<Parser.CsvParseResult> this.parse).header;
      this.table = (<Parser.CsvParseResult> this.parse).table;
      this.headerLength = this.header.length;
      this.disableHeadlineSelection = false;
    } else if (this.parse.type === 'parseError') {
      this.errors = (<Parser.CsvParseError> this.parse).errors;    
      this.disableHeadlineSelection = true;  
    }

    this.disableSelection = false;
  }

  trackByFn(index: any, item: any) {
    return index;
 }

  toggleHeadlineUsage() {    
    if (this.headlineUsage == "own") {
      // copy header instead of reference
      let headerCopy = this.header.slice();
      // set header copy as first table line  
      this.table.unshift(headerCopy);
      // empty current header
      this.header = []; 
      // use length of first table row
      this.header.length = this.table[0].length;    
    } else if (this.headlineUsage === "file") {
      // set first table row as header
      this.header = this.table.shift();
    }
  }


  toggleDelimiter(delimiter: string) {
    if(this.currentDelimiters.includes(delimiter)) {
      this.currentDelimiters.splice(this.currentDelimiters.indexOf(delimiter), 1);
    } else {
      this.currentDelimiters.push(delimiter);

    }  
    if(this.fileData) {
      this.parseProcess();
    }      
  }

  toggleSemicolon() {
    this.toggleDelimiter(';');
  }

  toggleComma() {
    this.toggleDelimiter(',');
  }

  toggleSpace() {
    this.toggleDelimiter(' ');
  }

  toggleTab() {
    this.toggleDelimiter('  ');
  }

  changeMarker() {
    if(this.fileData) {
      this.parseProcess();
    }  
  }

  save() {
    // TODO
  }
}