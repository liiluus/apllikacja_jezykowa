import React from "react";

export function Container({ children, className = "" }) {
return <div className={`mx-auto max-w-6xl px-4 ${className}`}>{children}</div>;
}

export function Card({ title, children, className = "" }) {
return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
        {title ? <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div> : null}
        {children}
    </div>
);
}

export function Badge({ children, className = "" }) {
return (
    <span className={`inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 ${className}`}>
        {children}
    </span>
);
}

export function Button({
variant = "primary", // primary | secondary | ghost | danger
className = "",
children,
...props
}) {
const base =
"inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-800 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
};

return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
        {children}
    </button>
);
}
