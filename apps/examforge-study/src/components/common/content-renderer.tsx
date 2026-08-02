
interface Props {
    content: string
}

export default function ContentRenderer({ content }: Props) {
    return (
        <div dangerouslySetInnerHTML={{ __html: content }} />
    )
}