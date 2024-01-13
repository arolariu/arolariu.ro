
interface Props {
    params: {
        account: string
    }
}
export default async function AccountPage({params}: Readonly<Props>) {
    return (
        <main className="m-20">
            <section>
                <h1> Your account is {params.account} </h1>
            </section>
        </main>
    )
}
