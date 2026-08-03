
interface Props {
    content: string
}

export default function ContentRenderer({ content }: Props) {
    return (
        <p dangerouslySetInnerHTML={{ __html: content }} />
    )
}