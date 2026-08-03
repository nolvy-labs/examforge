
interface Props {
    content: string
}

export default function ContentRenderer({ content }: Props) {
    return (
        <span dangerouslySetInnerHTML={{ __html: content }} />
    )
}