type BasicChildrenProps = {
    children: React.ReactNode
}

type LoginFormValues = {
    userName: string;
    password: string;
}

type RegisterFormValues = {
    name: string
    userName: string;
    password: string;
}

type NavbarBtnsSection = {
    userName: string | null | undefined,
    userImage: string | null | undefined
}