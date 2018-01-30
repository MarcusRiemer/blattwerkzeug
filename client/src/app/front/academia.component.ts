import { Component, OnInit } from '@angular/core'
import { Observable } from 'rxjs/Observable'

interface Thesis {
  id: string
  title: string
  subtitle: string
  author: {
    name: string
  }
  institutionLogo,
  abstract: string
  degree: string
  url: string
  date: Date
}

/**
 * For the moment there is no reason to grab the thesis information from
 * any dynamic third party service or server.
 */
const THESIS_BASE_URL = "http://files.blattwerkzeug.de/theses";

const LOGO_FHW_URL = "/vendor/logos/fhw.png";
const LOGO_CAU_URL = "/vendor/logos/cau.png";

/**
 * Knows everything about theses that have been written.
 */
@Component({
  templateUrl: 'templates/academia.html',
})
export class AboutAcademiaComponent {

  private _theses: Thesis[] = [
    {
      id: "origin",
      title: "BlattWerkzeug",
      subtitle: "Eine datenzentrierte Entwicklungsumgebung für den Schulunterricht",
      author: {
        name: "Marcus Riemer"
      },
      degree: "Master of Science",
      institutionLogo: LOGO_FHW_URL,
      url: `${THESIS_BASE_URL}/marcus-riemer-thesis-blattwerkzeug.pdf`,
      abstract: `
<p>
Konventionelle Entwicklungsumgebungen sind speziell auf die Bedürfnisse von professionellen Anwendern zugeschnittene Programme. Aufgrund der damit verbundenen Komplexität sind sie aus didaktischer Sicht nicht für die Einführung in die Programmierung geeignet. Diese Thesis beschreibt daher ein Konzept und die prototypische Implementierung einer Lehr-Entwicklungsumgebung für Datenbanken und Webseiten namens BlattWerkzeug.
</p>
<p>
Um syntaktische Fehler während der Programmierung systematisch auszuschließen, werden die Bestandteile der dafür benötigten Programmier- oder Textauszeichnungssprachen ähnlich wie in der Lehrsoftware „Scratch“ grafisch durch Blockstrukturen repräsentiert. Diese Blöcke lassen sich über Drag &amp; Drop-Operationen miteinander kombinieren, die syntaktischen Strukturen von SQL und HTML sind für Lernende dabei stets sichtbar, müssen aber noch nicht verinnerlicht werden. So lassen sich auch ohne die manuelle Eingabe von Codezeilen eigene Webseiten programmieren, welche dann im Freundes- und Bekanntenkreis weitergegeben werden können. Für den Unterrichtseinsatz ist der aktuelle Entwicklungsstand von BlattWerkzeug allerdings noch nicht geeignet, er dient vornehmlich der Erprobung und Demonstration der erdachten Konzepte.
</p>`,
      date: new Date('October 31, 2016')
    },
    {
      id: "goergen-mittelstufe",
      title: "Einführung von Datenbanken in der Mittelstufe",
      subtitle: "unter Verwendung von esqulino",
      author: {
        name: "Stefan Görgen"
      },
      institutionLogo: LOGO_CAU_URL,
      degree: "Bachlor",
      url: `${THESIS_BASE_URL}/stefan-görgen-thesis-db-mittelstufe.pdf`,
      abstract: `<p>Erarbeitung einer Unterrichtseinheit zu Datenbanken in der Mittelstufe.</p>`,
      date: new Date('October 14, 2016')
    },
    {
      id: "pawlowski-schema",
      title: "Entwicklung eines Datenbankschemaeditors",
      subtitle: "für den Einsatz im Schulunterricht",
      author: {
        name: "Marco Pawlowski"
      },
      institutionLogo: LOGO_FHW_URL,
      degree: "Bachlor",
      url: `${THESIS_BASE_URL}/marco-pawlowski-thesis-schema-editor.pdf`,
      abstract: `
<p>Mit dieser Arbeit wird eine Lernsoftware entwickelt, die an Anfänger gerichtet ist. Es werden die elementaren Funktionen zur Erstellung von Datenbanken zur Verfügung gestellt werden. Dabei sollen Fehler nicht von der Software automatisch gelöst werden, sondern an den Benutzer kommuniziert werden. Dadurch soll der Benutzer ein Verständnis dafür entwickeln, welche Bedingungen vorher erfüllt sein müssen, um bestimmte Aktionen durchzuführen zu können.</p>`,
      date: new Date('May 2, 2016')
    },
    {
      id: "just-images",
      title: "Verwaltung und Integration von Bildern",
      subtitle: "",
      author: {
        name: "Ole Just"
      },
      institutionLogo: LOGO_FHW_URL,
      degree: "Bachlor",
      url: `${THESIS_BASE_URL}/ole-just-thesis-images.pdf`,
      abstract: `<p>SQLino ist eine webbasierte IDE für HTML und SQL auf Einsteigerniveau. Diese Arbeit beschreibt die Entwicklung einer prototypischen Bildverwaltung für SQLino, die neben der bloßen Speicherung und Einbettung der Bilder in die erstellen Webseiten auch rechtliche Aspekte im Umgang mit der Veröffentlichung von Bildern beachtet.</p>`,
      date: new Date('October 31, 2017')
    }
  ]

  public get theses(): Observable<Thesis[]> {
    return (Observable.of(this._theses));
  }
}
