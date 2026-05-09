import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonFileCourseAccessStore } from "./courseAccessStore";
import { createEmptyCourseAccessState } from "../../../shared/domain";

const tempDirs: string[] = [];

function createTempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-course-access-"));
  tempDirs.push(dir);
  return new JsonFileCourseAccessStore(path.join(dir, "course-access.json"));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("course access JSON store", () => {
  it("persists course access by user id", () => {
    const store = createTempStore();
    store.save("u_10001", {
      ...createEmptyCourseAccessState(),
      ownedCourseIds: [16],
    });

    const reloadedStore = new JsonFileCourseAccessStore(
      path.join(tempDirs[0], "course-access.json")
    );

    expect(reloadedStore.load("u_10001").ownedCourseIds).toEqual([16]);
  });

  it("keeps users isolated from each other", () => {
    const store = createTempStore();
    store.save("u_10001", {
      ...createEmptyCourseAccessState(),
      ownedCourseIds: [16],
    });

    expect(store.load("u_20001").ownedCourseIds).toEqual([]);
  });
});
