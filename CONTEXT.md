# SmartFactory Check & Chat

Shared domain for the factory pre-shift inspection and incident command system. This repo is the **WebManager** client; the Android tablet and Node API live in sibling `SmartFactorySma_AdrApp`. Both share SQL Server `SmartFactoryDB`.

## Language

### Actors & access

**Admin**:
Manager account used only on the Web Manager console (PC).
_Avoid_: supervisor UI user, web user

**TabletUser**:
Device-bound shop-floor account (`tablet1`…`tablet10`) used only on the Android tablet app.
_Avoid_: worker account, operator login, mobile user

**Zone**:
A physical shop area / department that groups machines and default tablet assignments.
_Avoid_: department (UI label only), bộ phận (display), area

**Machine**:
A piece of equipment in a Zone that must be inspected once per CheckDate.
_Avoid_: device, TB, asset

### Shift clock

**Shift**:
A named work period (DAY or NIGHT) with work hours and a FormWindow.
_Avoid_: session, ca (display)

**FormWindow**:
The open interval (`FormOpenTime` → `FormDeadlineTime`) when TabletUsers may submit DailyChecks.
_Avoid_: submit window, gate, checklist period

**ShiftStatus**:
Per CheckDate + Shift record of whether the form is enabled, when it locked, and compliance rate.
_Avoid_: form lock log, daily shift state

**CheckDate**:
The calendar date that owns DailyChecks and ShiftStatus for a shift session (including night sessions that cross midnight).
_Avoid_: work date, log date (column name only)

### Inspection

**DailyCheck**:
One inspection result per Machine per CheckDate: `OK`, `NG`, or `MISSING`.
_Avoid_: checklist submission, form result, report row

**CheckedBy**:
Free-text name typed on the tablet for who performed an OK/NG DailyCheck; must be null for MISSING.
_Avoid_: employee name, signer

**Checklist**:
The on-device question set used to decide OK vs NG. Questions are not stored in the database today.
_Avoid_: form template, inspection template

**MISSING**:
System-assigned DailyCheck status for a Machine left unchecked after FormWindow deadline.
_Avoid_: skipped, overdue, unpaid check

### Incidents & chat

**TaskIncident**:
The repair ticket created when a DailyCheck is NG; holds error text, photo, and lifecycle status.
_Avoid_: ticket, fault, NG record

**IncidentStatus**:
Lifecycle of a TaskIncident: `pending` → `processing` → `resolved`.
_Avoid_: open/closed, active/done

**Conversation**:
The single chat room bound to one TaskIncident; locked when the incident is resolved.
_Avoid_: chat room, thread (unless referring to Messages list)

**Message**:
A chat entry in a Conversation from Admin, TabletUser, or system.
_Avoid_: chat bubble, notification

**MessageTranslation**:
Cached AI translation of a Message into `vi`, `en`, or `ko`.
_Avoid_: glossary hit, live translation

### Clients (product split)

**WebManager**:
PC browser control room: KPIs, reports, incidents, chat, resolve, inspection log.
_Avoid_: webapp, dashboard app

**AndroidTablet**:
Shop-floor capture client: login, Zone pick, machine dashboard, Checklist submit.
_Avoid_: mobile app, worker app
