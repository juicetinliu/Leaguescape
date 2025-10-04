## Intro/Context
The following document highlights the requirements for building a webapp that plays a role in a larger escape room/game. This webapp is essentially an online store, allowing [character]s in the game to purchase [item]s with [gold] later use the [item]s for tasks and puzzles.
The [admin] oversees the [game], and is given special tools through the same webapp, to:
* Initialize the game state and setup/manage the [player]/[character]/[items]s
* Manage - during the game - game states, and [character]/[item] states
* View - during the game - game states, and [character]/[item] states
* End the game, and view final states
The intention is for the webapp to work on both mobile/desktop, but for development purposes, we'll first develop for Desktop (and build for mobile views later)

## Tech
* [Supabase](https://supabase.com/docs) - to host the [game] data and handle auth
* React and Vite to build the webapp

# Definitions

## Roles
* [visitor] - we define a person plainly visting the webapp as a [visitor]. 
* [user] - A user is a [visitor] who is authenticated by Supabase. They will be able to join/create a [game].  

### User - Game Roles
Within each valid [game] - e.g a [user] can have ONE of the following roles:
* [admin] - this is the [user] who created the [game]
* [player] - any subsequent [user] who joins the [game] is a [player]
* [*character] - this is only accessible by the [player] with the correct login details. More on this later.

## Game
Each [game] is unique - the id/password of a game can be managed by the [admin]

The follow game states define a valid [game]
* `[Setup]` - This is when the [admin] intializes the [game] with the correct [*character]/[item]s. [player]s can also be managed by the [admin] before the game starts.
* `[Running]` - This is after the [admin] starts the game. Note that changes to [*character]/[item]s are still allowed during this state, both by the [player] or [admin]!
* `[End]` - This is after the [admin] ends the game. Changes are NOT allowed. This state is for review purposes!

States only progress from `[Setup]` -> `[Running]` -> `[End]`, and NOT backwards.

# Pages
Here's a brief intro for what each page will display. See "Flows" for detailed display/interaction/how pages lead to each other.

## Landing pages

Page id [who can view this page]:
* `Index` [visitor] - Shows a log in page/proceed as guest (for anonymous auth), leading to the `User` page. The `Info` page is also linked here
* `Info` [visitor/user] - Shows info about the game/more details
* `User` [user] - Displays games created by the [user], or allows the [user] to join an existing [game] or create a new [game]. 

## Game pages
The following pages can only be viewed by [user]s (i.e. someone who has either just created or joined an existing [game])

Page id [what [user] role(s) can view this page]:
* `Lobby` [player] - The [player] can see brief details about the [game], as well as other [player]s.
* `Admin` [admin] - has an overall [game] state view - mostly read only. The lobby can be managed here. [game]/[*character]/[item] settings can be managed during the `[Setup]` and `[Running]` states
* `Login` [player] - Allows the [player] to log in to become a [*character]
* `Character` [*character] - Main screen, with options to the following:
    * `Shop` [*character] - Shows available items, more details later
    * `Shop - secret` [*character] - Shows ALL items, more details later
    * `Bank` [*character] - Shows [gold] related details for the [*character], including [gold] balance and transaction/deposit/withdrawal history. Allows actions like depositing/withdrawing [gold].
    * `Inventory` [*character] - shows [item]s owned by the [*character]
* `Credits` [player] - shows details after the [game] is in the `[End]` state

# Flows

## Non-game Flows

### `Index` Page
A log in prompt is shown, with an option to log in as a guest (anonymous user). Log in can be also be done oauth providers later like Google! 

As mentioned earlier, there's a link to the `Info` page.

Successfully logging in leads you to the `User` page.

### `Info` Page
Empty for now - will contain details about the game!

### `User` Page
This page header should display the [user]'s name - with an option to edit it. A logout button is displayed, which will take the user back to the `Index` page and turn the [user] into as [visitor].

At the top of the page, we are presented with "Join" or "Create" game. 
* Pressing "Join" prompts the [user] for an existing [game] ID and password. Successful joins will make the [user] a [player] for that [game], and lead them to the `Lobby` page (if the game is still in the `[Setup]` state) or `Login` page (if the game is in the `[Running]` state) or `Credits` page (if the game is in the `[End]` state)
    * If the [user] enters details for an existing [game] where they are an [admin], they will enter the `Admin` page.
* Pressing "Create" will create a new [game] and make the [user] an [admin] for that [game]. They will immediately enter the `Admin` page.
Either way, successfully entering a [game] will add that [game] to the [user]'s history.

A brief history of the [user]'s past [game]s are shown at the bottom - these will be [game]s where the [user] was an [admin] or [player], allowing them to quickly join. For [game]s where the [user] was an [admin], they will directly join the game. For [game]s where the [user] was an [player], they will directly join the game. 

## Game Flows
We'll use the Game states to help describe the flows.

### `Admin` Page - `[Setup]` state
When a [game] is created by the [admin], they are presented with the `Admin` page. This page should display:
    - Header
        - [game] ID and password - necessary for other [user]s to join. The admin can edit the password here.
        - "Start Game" button - requires confirmation, but will move the [game] to the `[Running]` state
        - "Exit Game" button - which does NOT end the [game], but leads the [admin] back to the `User` page and sets the [admin] back to a [user].
    - The current lobby - which [player]s are in the [game] - with actions to kick/ban [player]s if necessary. This can be minimized.
    - Tabbed views for:
        - "Profiles": [*character] overviews in a grid of profiles. Tapping on a profile opens a preview window on the right with detailed information about each [*character]. There's an "edit" and "delete" button in the preview window to manage the selected [*character]. In the grid of profiles, the last entry is an "Add Profile" button.
            - Pressing edit/Add Profile leads to the same popover - that allows you to edit all the [*character] details.
        - "Items": [item] overviews - TBD
        - "Bank": Similar to Profiles, but with the preview window on the right showing detailed bank/[gold] information. There are options to deposit/withdraw [gold] after confirmation too. There is NO option to add/edit/delete profiles.

### `[Running]` Phase

### `[End]` Phase