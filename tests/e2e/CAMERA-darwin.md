# Personal camera views

The real game runs in a resizable device frame; portrait and landscape poses stay independent. All captures are 1180×820 at 1×; verification allows zero different pixels.

## Normal play keeps the portrait camera locked

Viewpoint: **Alex**

![Normal play keeps the portrait camera locked](./screenshots/000-camera-locked-alex-darwin.png)

- [x] Dragging does not move the camera or discard a card

## Set Camera turns the table without playing cards

Viewpoint: **Alex**

![Set Camera turns the table without playing cards](./screenshots/001-camera-adjusting-alex-darwin.png)

- [x] Card choices are disabled while camera controls are unlocked

## Landscape has its own saved view

Viewpoint: **Alex**

![Landscape has its own saved view](./screenshots/002-camera-landscape-alex-darwin.png)

- [x] Setting landscape leaves the portrait pose intact

## Repeated rotation restores the same landscape view

Viewpoint: **Alex**

![Repeated rotation restores the same landscape view](./screenshots/003-camera-rotated-alex-darwin.png)

- [x] No camera scale or target drift after three portrait/landscape cycles

## Reset View restores only landscape

Viewpoint: **Alex**

![Reset View restores only landscape](./screenshots/004-camera-reset-alex-darwin.png)

- [x] The reviewed default landscape camera returns

## Returning restores portrait and locks the controls

Viewpoint: **Alex**

![Returning restores portrait and locks the controls](./screenshots/005-camera-restored-alex-darwin.png)

- [x] Saved camera survives reload, reset in another orientation, and normal play resumes
