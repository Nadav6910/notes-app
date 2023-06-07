type BasicChildrenProps = {
    children: React.ReactNode
}

type LoginFormValues = {
    userName: string
    password: string
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
    createdAt: date
}