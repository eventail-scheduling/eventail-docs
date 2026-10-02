# Showing the schedule

An integration reads an edition's published schedule and shows it somewhere else: on the
conference website, in an app or on screens at the venue. Eventail does not render a public
schedule itself.

An integration mostly needs 1 endpoint: it fetches the current schedule, then polls the same URL for
changes. Eventail sends no notifications, and each response is a complete snapshot of what is
published.

If the consumer you have in mind reads the
[Furry Schedule Schema](https://github.com/Alofoxx/furry-schedule-schema) format, the
[furry schedule adapter](/furry-schedule-adapter/) already does all of this and serves that
document, so you do not have to write any of what follows.

Paths below are relative to the API's URL: `/editions/{editionId}/schedules/current` means
`https://api.eventail.example.com/editions/{editionId}/schedules/current`.

## Get a token

An integration signs in as itself, with its own client at the sign-in provider and the client
credentials flow; [Sign-in provider](/self-hosting/sign-in-provider#the-integration-s-client)
covers the setup. The token response's `expires_in` gives the token's lifetime in seconds;
request a new one before it runs out. Send the access token on every request, and ask for
JSON:API in `Accept`:

```http
Authorization: Bearer <access token>
Accept: application/vnd.api+json
```

Leaving `Accept` out also works, but a client that asks only for `application/json` gets `406`.

To find the edition's ID, list the editions:

```http
GET /editions
```

## Read the current schedule

```http
GET /editions/{editionId}/schedules/current
```

The response is a [JSON:API](https://jsonapi.org) document with the edition's newest
publication, always complete, never paginated. Before the first publication the answer is
`404`, with an error whose `code` is `not_found`.

The `schedule` resource carries:

| Attribute              | Meaning                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `publishedAt`          | When this version was published.                                                                                                                       |
| `preliminary`          | `true` when the organizers published this version as preliminary, so times may still change. Once a final version is out, every later one has `false`. |
| `startDate`, `endDate` | The first and last day the schedule covers, as ISO 8601 dates such as `2027-11-01`.                                                                    |
| `timeZone`             | The time zone to show times in, as an IANA name such as `Europe/Berlin`.                                                                               |

Show slot times in the schedule's `timeZone`. It is fixed at publication, and the edition's
time zone may have changed since.

The schedule's `slots` relationship holds the placed sessions, confirmed ones only. Each `slot`
relates to its `session` and its `location`, and carries:

| Attribute                   | Meaning                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `stableId`                  | The slot's identity across publications; see [Match items across versions](#match-items-across-versions). |
| `startsAt`, `endsAt`        | When the session itself runs, as UTC instants.                                                            |
| `setupTime`, `teardownTime` | How long the room is also taken before and after, as ISO 8601 durations such as `PT15M`.                  |

The document always includes the edition. It includes the slots too, unless you send an empty
`include`. Ask for more with `include`:

```http
GET /editions/{editionId}/schedules/current?include=slots.location,slots.session.hosts,slots.session.track,slots.session.sessionType
```

Available includes:

- `slots.location`
- `slots.session.track`
- `slots.session.sessionType`
- `slots.session.hosts.responses.customField`
- `slots.session.responses.customField`

Any shorter path works too, such as `slots.session` or `slots.session.hosts`.

Sparse fieldsets trim the document to what you show, for example
`fields[session]=title,abstract`. Type names in fieldsets are snake case: `fields[session_type]`,
`fields[custom_field]`.

### Fields per resource

[Show the current schedule](/reference/api/0.1/showCurrentSchedule) in the API reference lists
every attribute and relationship of each resource. It also lists attributes only organizers
receive, which an integration never gets:

- a host's `emailAddress`;
- a session's `notes`;
- a session type's attributes other than `name`, `externalKey` and `internal`;
- a custom field's attributes other than `externalKey`, `target`, `title` and `options`;
- the edition's `sessionFieldOptions` and `profileFieldOptions`.

Answers to custom fields (`responses` in the API) are included only for fields not marked
confidential. For a choice field, the custom field's `options` hold the labels behind the IDs in
`value`.

`teaserImage` and `avatar` are `null` when there is no image. Otherwise each is an object with
`key`, `url`, `thumbnailUrl`, `filename` and `processing`, and both URLs are public.

While `processing` is `true`, both URLs serve the original upload. When processing finishes,
shortly after the upload, a WebP version replaces it under new URLs, downscaled if it exceeds the
size limit: the edition's for teaser images, a fixed one for avatars. An upload that cannot be
decoded is dropped instead, and the field turns `null`.

An image nothing refers to anymore is deleted after at least 24 hours by default. Always link to
the URLs from your latest document, and never keep old ones.

`internal` marks tracks and session types the organizers use for their own purposes; filter
them out yourself if they should not be shown.

## Keep it current

Every successful response carries an `ETag`. Send it back in `If-None-Match`, and the API
answers `304 Not Modified` with no body until something changes:

```http
GET /editions/{editionId}/schedules/current
If-None-Match: W/"50d858e0985ecc7f60418aaf0cc5ab587f42c2570a884095a9e8ccacd0f6545c"
```

```http
HTTP/1.1 304 Not Modified
ETag: W/"50d858e0985ecc7f60418aaf0cc5ab587f42c2570a884095a9e8ccacd0f6545c"
```

The tag is opaque: compare it, never parse it. It changes on every new publication and on any
change to something the document can show, such as a session's title, a host's biography or a
track's color. It can also change when nothing in your document did, for example after an edit
to a track you do not include. The tag does not depend on `include` or `fields`: if you change
your query, drop the stored tag and fetch the full document once.

Sessions, hosts, tracks, session types, locations and answers are read live, so their edits reach
the document without a new publication. Slot times, and which location a slot is in, change only
when the organizers publish again. A session that leaves the confirmed state, for example because
it was canceled, drops out of the document at once, together with its slot.

Poll every 60 seconds, and every 15 seconds while the event runs. An unchanged schedule costs a
`304` and nothing else.

## Match items across versions

Each publication is a new schedule with new slot IDs. To tell whether a slot moved or is new,
match slots by `stableId`, which stays the same across publications. A slot the organizers
delete and place again gets a new `stableId`. Sessions, hosts, tracks, session types and
locations keep their IDs.

Replace your copy with each new document. A slot, session or host that is no longer in it has
been removed or unpublished.

## Read the edition's configuration and files

The same token can read the edition's configuration:

- `GET /editions/{editionId}`
- `GET /editions/{editionId}/tracks`
- `GET /editions/{editionId}/session-types`
- `GET /editions/{editionId}/locations`
- `GET /editions/{editionId}/custom-fields`

Each list endpoint also has a by-ID form, such as `GET /editions/{editionId}/tracks/{trackId}`.
None of these is covered by the schedule's `ETag`; fetch them in full when you need them. Some
carry more than the schedule does, such as the edition's form settings and a session type's
default duration, which an integration has no use for.

Files attached to answers are private. Request a download link with:

```http
GET /editions/{editionId}/responses/{responseId}/file
```

The response is a `signed_get` resource whose `url` stays valid for `expiresIn` seconds,
currently 300. This works for a file answering a non-confidential custom field on a confirmed
session in the schedule, or on one of its hosts. A request for any other answer's file gets `404`,
with an error whose `code` is `file_not_found`.

Routes that serve people's data, such as the session list or profiles, answer `403` to an
integration.
