---
layout: home

hero:
  name: Eventail
  text: Call for papers and scheduling
  tagline: >-
    Run your conference's program: collect submissions, choose sessions with your team, build the
    timetable and publish it for your website to show.
  image:
    src: /logo-color.svg
  actions:
    - theme: brand
      text: Introduction
      link: /guide/introduction
    - theme: alt
      text: Self-hosting
      link: /self-hosting/docker-compose
    - theme: alt
      text: Showing the schedule
      link: /integration/schedule

features:
  - title: Call for papers
    details:
      Each edition has its own submission form. Choose which built-in fields it asks for, and add
      custom questions for sessions and their hosts.
    link: /guide/introduction#concepts
    linkText: Concepts
  - title: Acceptance and confirmation
    details:
      A manager accepts or rejects what comes in. Hosts confirm their accepted sessions, or a
      manager confirms for them.
    link: /guide/introduction#concepts
    linkText: Concepts
  - title: Timetable
    details:
      Place sessions on a draft schedule and publish it as often as you like, as preliminary or as
      final.
    link: /guide/introduction#concepts
    linkText: Concepts
  - title: Your own website
    details:
      Your website or app reads the published schedule from the API and polls it for changes.
      Only confirmed sessions appear.
    link: /integration/schedule
    linkText: Showing the schedule
  - title: Self-hosted
    details:
      Run it with Docker Compose, which includes PostgreSQL, or with the Helm chart. You bring the
      bucket, SMTP server and sign-in provider, and with Helm the database too.
    link: /guide/introduction#what-runs
    linkText: What runs
  - title: Configuration and API reference
    details: Every setting and every API endpoint, for each minor version.
    link: /reference/configuration/
    linkText: Configuration
---
