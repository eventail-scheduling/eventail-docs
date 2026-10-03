# Introduction

Eventail runs the program side of a conference: the call for papers, the review of what comes
in and the schedule. People submit sessions through the web app and managers accept or reject
them. One of its hosts or a manager then confirms each accepted session.
Organizers place sessions on a timetable and publish it, and your website or app reads the
published schedule from the API. Only confirmed sessions appear in it.

## Concepts

- **Edition:** one run of a conference, with its dates and time zone. Sessions, hosts, tracks,
  session types, venues, locations, custom fields and schedules each belong to an edition.
- **Session:** a talk, workshop or any other item that takes a slot. A session is in one of
  these states: submitted, accepted, confirmed, rejected, withdrawn or canceled.
- **Host:** a person presenting a session. A session can have several. Hosts can invite more
  by email while the session is submitted or accepted; managers can invite at any time.
- **Team:** a group of organizers who share one role (admin, manager or viewer) across every
  edition. A person on several teams gets the highest of their roles.
- **Tracks, session types, venues and locations:** tracks and session types group sessions,
  locations are where they happen, and every location sits in a venue.
- **Custom fields:** extra questions on the submission form or on a host's profile.
- **Schedule:** the timetable. Organizers edit a draft and publish it as often as they like,
  each time as preliminary or final. After a final publication, later ones are final too. An
  integration, such as your website or app, reads the newest publication.

## What runs

An Eventail installation is 2 images plus 4 services they depend on:

- **The API**, which the web app and integrations talk to. It also runs background work:
  sending email, processing uploaded images and periodic cleanup. Part of the cleanup deletes
  accounts whose owner has not opened the web app for 180 days, unless they host a session or
  belong to a team. By default the Helm chart moves this work into a separate worker.
- **The web app**, a single-page app served by nginx.
- **PostgreSQL.** Eventail is developed and tested against version 17.
- **An S3-compatible object store** for uploaded images and files.
- **An SMTP server** for email.
- **A sign-in provider** that speaks OpenID Connect. Eventail keeps no passwords.

The Docker Compose setup runs PostgreSQL for you. You provide the object store, the SMTP server
and the sign-in provider. With the Helm chart you provide all 4.

The images are published as `ghcr.io/eventail-scheduling/eventail-api` and
`ghcr.io/eventail-scheduling/eventail-web`. Both are built from
[eventail](https://github.com/eventail-scheduling/eventail) and released together, so run them
at the same tag.

## Next steps

- To run Eventail, start with [Docker Compose](/self-hosting/docker-compose) on a single host
  or [Kubernetes](/self-hosting/kubernetes) with the Helm chart.
- To show a schedule on your own site, read the [integration guide](/integration/schedule).
