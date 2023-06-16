import NoteItemsList from './src/components/note-page-components/NoteItemsList';
type BasicChildrenProps = {
    children: React.ReactNode
}

type LoginFormValues = {
    userName: string
    password: string
}

type RenameNoteFormValues = {
    newName: string
}

type RegisterFormValues = {
    name: string
    userName: string
    password: string
}

type CreateNoteFormValues = {
    name: string
}

type NavbarBtnsSection = {
    userName: string | null | undefined,
    userImage: string | null | undefined
}

type NavbarDrawer = {
    isSession: boolean,
    userName: string | null | undefined,
    userImage: string | null | undefined
}

type NoteTypeSelectorProps = {
    createdNoteType: Function
}

type NoteCardProps = {
    noteName: string,
    noteType: string,
    createdAt: date,
    noteId: string,
}

type ConfirmDeleteNotePopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    noteId: string,
    OnDelete: function, 
    onError: function
}

type ConfirmDeleteNoteItemPopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    entryId: string,
    OnDelete: function, 
    onError: function
}

type RenameNotePopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    noteId: string,
    currentName: string,
    OnRename: function, 
    onError: function
}

type RenameNoteItemPopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    entryId: string,
    currentName: string,
    onRename: function, 
    onError: function
}

type Entry = {
    entryId: string;
    noteId: string;
    item: string;
    isChecked?: boolean | null;
}

type AddNoteItemPopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    noteId: string,
    onAdd: function,
    onError: function
}

type AddNoteItemFormValues = {
    itemName: string
}