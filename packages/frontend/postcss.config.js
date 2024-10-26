import tailwindcss from "tailwindcss";
import prefixwrap from "postcss-prefixwrap";

export default {
    plugins: [
        tailwindcss(),
        prefixwrap("#plugin--notesplusplus"),
    ],
}