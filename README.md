# The BlattWerkzeug-Project

Conventional development environments are programs that are tailored to suit the needs of professionals. Due to their complexity they do not lend themselves well to introduce pupils to programming. This project is the prototypical implementation of an educational software for database- and web-development.

To eliminate the possibility of syntactical errors while programming, the elements of the programming- or markup-languages are represented by graphical blocks, similar to the approach taken by the software [Scratch](https://scratch.mit.edu/). These blocks can be combined by using drag & drop operations. The syntactical structures of `SQL` and `HTML` are not hidden from the user, but it is not mandatory to internalize them. This approach allows pupils to program and share their own websites, without the need to type lines of code.

## Where to start? (Thesis-Juliane-Plückhahn-Edition)

1. Provide your OpenAI API key (`OPEN_AI_API_KEY`) in `docker-compose.yml`
2. Start the server

```
> docker compose up
...SNIP...
server-1  | [Project] Loading {"de"=>"Mario Kart Wii"} (mario-kart-wii, 0eeeb53d-6767-4118-a396-82ebfbb27d02)
server-1  |   [ProjectUsesBlockLanguage] Loading "Generated SQL" (sql, cb3f1cce-1337-441f-ab0c-788f3b60bc4d)
server-1  |   [CodeResource] Loading "A01: Cups mit P" (e0034c8c-9160-4f53-a8a9-43a50d1ccf60)
server-1  |   [CodeResource] Loading "A05: Strecken GBA oder GCN" (789afc65-c75d-4de2-813d-c967a437830f)
server-1  |   [CodeResource] Loading "B03: Retro Strecken Blitz Cup" (e0857c68-d0da-40b8-b7f9-294d52d58620)
server-1  |   [CodeResource] Loading "A07: Strecken mit Kanone" (3a876b8f-6791-4e60-a80b-65d95d423ece)
server-1  |   [CodeResource] Loading "B04: Swooper + runterfallen" (5ec01b7d-ed24-45ff-bb07-f5bceef43c63)
server-1  |   [CodeResource] Loading "B07: Strecken Spezial Cup" (d7f5a3f2-764a-425e-b727-44338096fa48)
server-1  |   [CodeResource] Loading "B08: Strecke mit Hindernis Gumba" (13aaba7e-411c-499a-b089-ef2de6faf9ab)
server-1  |   [CodeResource] Loading "B09: Spieler gewählte Fahrer" (07cd3a9c-4652-415d-ac08-c9eeed74152a)
server-1  |   [CodeResource] Loading "C: Strecke Anz. Hindernisse" (25050100-6a1c-4423-be2f-6408e3154ab9)
server-1  |   [CodeResource] Loading "C: Meist genutzter Fahrer" (e35e81cd-b1c5-4fe0-8901-25a9f8f53256)
server-1  |   [CodeResource] Loading "C: Spieler schnellste Strecke" (d11083d2-1563-4678-8ec5-2d66fa4c6d0f)
server-1  |   [CodeResource] Loading "C: Gesamtfahrzeit pro Spieler" (843b5ad4-374b-4c54-b77a-12e52c0e5fbf)
server-1  |   [CodeResource] Loading "C: Anz. Gewinne pro Fahrer" (4dd78d61-a1cc-481d-9292-46d3ba7e3063)
server-1  |   [CodeResource] Loading "C: Fahrer bester Platz" (d598e6b9-305e-43ee-b185-fde22a757874)
server-1  |   [CodeResource] Loading "C: Anz Fahrer pro Spieler" (69680db7-4c55-4d03-b2b1-fab1b15098f1)
server-1  |   [CodeResource] Loading "B01: Daisy bestes Fahrzeug" (dca17499-e0ad-476d-9f0d-3ee07a9eea35)
server-1  |   [CodeResource] Loading "B02: Fahrer Heimstrecke mit Kanone" (7fe2c54a-6bca-4bbe-aa95-404a18899932)
server-1  |   [CodeResource] Loading "C: Anz Strecken pro Strategie" (b5a23967-f3fc-4d94-ad61-3cb7b963d178)
server-1  |   [CodeResource] Loading "C: Avg Regenbogenpiste vgl. Weltrekord(e)" (f04d636b-9a9f-4993-a683-4bca119ea24b)
server-1  |   [CodeResource] Loading "C: Konsole Anz Retrostrecken" (b36cf174-38d0-4784-95a2-592009f31c6b)
server-1  |   [CodeResource] Loading "A08: Streckenname DE = ENG" (1f03e599-3aae-4fe7-a756-26d153c88494)
server-1  |   [CodeResource] Loading "A02: Fahrzeug ohne freischalten" (9e275422-6610-4e4f-abe6-0fba4537f373)
server-1  |   [CodeResource] Loading "A04: Hazardnamen gleich" (e86d87f9-316a-4a5f-a441-d2a8b9241d1e)
server-1  |   [CodeResource] Loading "A10: WR <= 20s" (e63c846f-f7ef-4a27-a043-5060ace9784c)
server-1  |   [CodeResource] Loading "A03: Fahrer freischaltbar" (057277b2-17b9-4031-9a61-623976118af8)
server-1  |   [CodeResource] Loading "A06: Fahrzeuge Endung Bike" (df7428aa-7257-4f75-9a72-de379bb2bf3e)
server-1  |   [CodeResource] Loading "B06: Fahrzeuge mit Wheelie" (150f2a97-5e68-4142-945a-05860798f1b7)
server-1  |   [CodeResource] Loading "B10: Spieler Platz 1" (aa6ac939-93bf-43f6-b7f6-173e95fca3ba)
server-1  |   [CodeResource] Loading "A00 Playground" (a845eb0e-3d43-49a1-ae9f-a07d511ff902)
server-1  |   [CodeResource] Loading "A09: Fahrer mit W oder M" (d7968f8c-e595-4d5b-bf7b-49cc9b661047)
server-1  |   [CodeResource] Loading "B05: Spieler Platzierung Bananen Cup" (6dac0064-5495-4d15-93ee-5a3a0bbec754)
server-1  |   [ProjectDatabase] Loading "default" (f8fbc2f6-17c3-46ba-9fad-6cda07537348)
server-1  |     [ProjectDatabase] Copying database file from ../seed/databases/f8fbc2f6-17c3-46ba-9fad-6cda07537348.sqlite
...SNIP...
server-1  | => Booting Puma
server-1  | => Rails 7.1.5.2 application starting in development
server-1  | => Run `bin/rails server --help` for more startup options
server-1  | Puma starting in single mode...
server-1  | * Puma version: 5.6.9 (ruby 3.2.3-p157) ("Birdie's Version")
server-1  | *  Min threads: 5
server-1  | *  Max threads: 5
server-1  | *  Environment: development
server-1  | *          PID: 1
server-1  | * Listening on http://127.0.0.1:9292
server-1  | * Listening on http://[::1]:9292
server-1  | Use Ctrl-C to stop
```

3. Navigate to `http://localhost:9292`
