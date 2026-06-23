type Props = {
    eyebrow: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
};

export default function DojoPageHeader({
    eyebrow,
    title,
    description,
    actions,
}: Props) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                    {eyebrow}
                </p>
                <h1 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15]">
                    {title}
                </h1>
                {description && (
                    <p className="text-zinc-600 mt-3 max-w-2xl leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 shrink-0">{actions}</div>
            )}
        </div>
    );
}
