
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "surface-container-highest": "#e0e3e5",
                        "on-tertiary-fixed-variant": "#38485d",
                        "error-container": "#ffdad6",
                        "error": "#ba1a1a",
                        "background": "#f7f9fb",
                        "outline": "#737686",
                        "on-error": "#ffffff",
                        "surface": "#f7f9fb",
                        "primary-fixed": "#dbe1ff",
                        "inverse-on-surface": "#eff1f3",
                        "on-tertiary-fixed": "#0b1c30",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#b7c8e1",
                        "tertiary-container": "#5e6e85",
                        "on-primary-fixed": "#00174b",
                        "tertiary": "#46566c",
                        "on-primary-fixed-variant": "#003ea8",
                        "tertiary-fixed": "#d3e4fe",
                        "on-primary-container": "#eeefff",
                        "on-tertiary": "#ffffff",
                        "on-error-container": "#93000a",
                        "on-background": "#191c1e",
                        "surface-variant": "#e0e3e5",
                        "on-surface": "#191c1e",
                        "surface-container": "#eceef0",
                        "secondary": "#565e74",
                        "secondary-fixed": "#dae2fd",
                        "surface-dim": "#d8dadc",
                        "surface-bright": "#f7f9fb",
                        "secondary-container": "#dae2fd",
                        "inverse-primary": "#b4c5ff",
                        "primary-container": "#2563eb",
                        "inverse-surface": "#2d3133",
                        "on-secondary-container": "#5c647a",
                        "on-primary": "#ffffff",
                        "surface-container-low": "#f2f4f6",
                        "on-secondary-fixed-variant": "#3f465c",
                        "on-tertiary-container": "#e9f0ff",
                        "outline-variant": "#c3c6d7",
                        "surface-container-lowest": "#ffffff",
                        "primary-fixed-dim": "#b4c5ff",
                        "surface-tint": "#0053db",
                        "surface-container-high": "#e6e8ea",
                        "secondary-fixed-dim": "#bec6e0",
                        "on-secondary-fixed": "#131b2e",
                        "primary": "#004ac6",
                        "on-surface-variant": "#434655"
                    },
                    fontFamily: {
                        "sans": ["Inter", "sans-serif"],
                        "mono-data": ["JetBrains Mono", "monospace"]
                    }
                },
            },
            plugins: [
                ({ addVariant }) => addVariant('light', ':is(.light &)')
            ]
        }
    