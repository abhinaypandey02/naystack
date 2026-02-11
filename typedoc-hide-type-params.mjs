/**
 * TypeDoc plugin: removes type parameters from reflections so they are not
 * shown in the generated docs (reduces noise; code keeps full generics).
 */
import { Converter } from "typedoc";

/**
 * @param {import("typedoc").Application} app
 */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE, (_context, reflection) => {
    if (reflection.typeParameters?.length) {
      reflection.typeParameters = [];
    }
    const sigs = reflection.signatures;
    if (sigs) {
      for (const sig of sigs) {
        if (sig.typeParameters?.length) {
          sig.typeParameters = [];
        }
      }
    }
  });
}
