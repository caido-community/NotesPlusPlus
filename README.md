# Notes++ - Markdown powered notes functionality within Caido!

With Notes++ you can now take detailed, beautiful Markdown enabled notes directly in Caido.

Write notes just like you would in any other markdown capable application without ever having to leave Caido!

![Notes++](https://github.com/user-attachments/assets/721caf37-96dc-486a-83d0-2c7741690c91)


# Install

1. Clone this repo
`git clone https://github.com/Static-Flow/CaidoNotesPlusPlus`

2. Run `pnpm install`

3. Run `pnpm build`

4. Install the resulting `plugin_package.zip`

# Details

## Notes++ Specific Features

### Shortcuts

`ctrl+alt+n` - Jumps to the Notes++ tab

`ctrl+alt+c` - Copies the currently highlighted text to your currently selected note

### Replay Links

Using the custom syntax `@[<Replay_Name>]` Notes++ will render it as a clickable link which will take you directly to the associated replay tab!

### Inline image pasting

Simply copy an image to your clipboard and paste it into a note, Notes++ will convert it into a inline image tag! When exporting to MD the image will be converted into a simple data url for compatability.

### Export to MD/PDF

Notes can be exported to either as a Markdown document or a PDF right from the UI.

### Project siloed notes

Switching projects will show only the notes for that project.

### fuzzy searching of notes

The search bar above the note tree on the left can be used to search for a note by its content or name

### Disk Persistence

Notes are stored in `<user home dir>/.CaidoNotesPlusPlus/`

Each project is its own folder and the same folder structure of your notes in Cadio is reflected in the filesystem!

## Features Coming Soon

- [ ] Moving Notes Between Folders
- [ ] Link to HTTP History Request
- [ ] Other Community Ideas!
