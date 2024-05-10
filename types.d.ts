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
    _count: any;
    noteName: string,
    noteType: string,
    createdAt: date,
    noteId: string,
    entriesCount: number
}

type ConfirmDeleteNotePopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    noteId: string,
    noteName: string,
    OnDelete: function, 
    onError: function
}

type ConfirmDeleteNoteItemPopupProps = {
    isOpen: boolean,
    setIsOpen: Function,
    entryId: string,
    entryName: string,
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
    currentPriority: string | null | undefined,
    currentCategory: string | null | undefined,
    onRename: function,
    onPriorityChange: function,
    onCategoryChange: function, 
    onError: function,
    onSetPriorityError: function,
    onSetCategoryError: function,
}

type Entry = {
    entryId: string;
    noteId: string;
    item: string;
    createdAt: date;
    lastEdit?: date;
    isChecked?: boolean | null;
    priority?: string | null;
    category?: string | undefined | null;
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

type AddNoteItemFormValues = {
    itemName: string
}

type SortingMenuProps = {
    sortMethod: string, 
    sortByNewToOld: Function, 
    sortByOldToNew: Function, 
    sortByPriority: Function, 
    sortByChecked: Function, 
    sortByName: Function
}