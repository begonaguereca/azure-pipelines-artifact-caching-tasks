import * as path from "path";
import * as assert from "assert";
import * as ttm from "azure-pipelines-task-lib/mock-test";
import { platform } from "os";

before(function() {
  this.timeout(5000);
});

const hash = "2f6b1287b26ff4716cffdeeabd434aa1a3da9f092ebf87579a916ca0bf91cd65";

describe("RestoreCache tests", function() {
  before(function() { });

  after(() => { });

  it("RestoreCache runs successfully with warnings if no key files are found",
    function(done: MochaDone) {
      const tp = path.join(__dirname, "RestoreCacheNoKeyFiles.js");
      const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

      tr.run();

      assert.equal(tr.succeeded, true, "should have succeeded");
      assert.equal(
        tr.warningIssues.length > 0,
        true,
        "should have warnings from key file"
      );
      assert.equal(tr.errorIssues.length, 0, "should have no errors");
      assert.equal(
        tr.stdout.indexOf("no key files matching:") >= 0,
        true,
        "should display 'no key files matching:'"
      );

      done();
    });

  it("RestoreCache is skipped if run from repository fork", function(done: MochaDone) {
    const tp = path.join(__dirname, "RestoreCacheFromFork.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(tr.warningIssues.length, 0, "should have no warnings");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
        tr.stdout.indexOf("result=Skipped;") >= 0,
        true,
        "task result should be: 'Skipped'"
      );
    assert.equal(
        tr.stdout.indexOf("Caches are not restored for forked repositories.") >=
        0,
        true,
        "should display 'Caches are not restored for forked repositories.'"
      );

    done();
  });

  it("RestoreCache runs successfully if cache hit", (done: MochaDone) => {
    const tp = path.join(__dirname, "RestoreCacheCacheHit.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(tr.invokedToolCount === 1, "should have run ArtifactTool once");
    assert(
        tr.ran(
          `/users/tmp/ArtifactTool.exe universal download --feed node-package-feed --service https://example.visualstudio.com/defaultcollection --package-name builddefinition1 --package-version 1.0.0-${process.platform}-${hash} --path /users/home/directory/tmp_cache --patvar UNIVERSAL_DOWNLOAD_PAT --verbosity verbose`
        ),
        "it should have run ArtifactTool"
      );
    assert(
        tr.stdOutContained("ArtifactTool.exe output"),
        "should have ArtifactTool output"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert(
        tr.stdOutContained("set CacheRestored=true"),
        "'CacheRestored' variable should be set to true"
      );
    assert(
        tr.stdOutContained(`${process.platform}-${hash}=true`),
        "variable should be set to mark key as valid in build"
      );

    done();
  });

  it("RestoreCache runs successfully if cache miss", (done: MochaDone) => {
    const tp = path.join(__dirname, "RestoreCacheCacheMiss.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(tr.invokedToolCount === 1, "should have run ArtifactTool once");
    assert(
        tr.ran(
          `/users/tmp/ArtifactTool.exe universal download --feed node-package-feed --service https://example.visualstudio.com/defaultcollection --package-name builddefinition1 --package-version 1.0.0-${process.platform}-${hash} --path /users/home/directory/tmp_cache --patvar UNIVERSAL_DOWNLOAD_PAT --verbosity verbose`
        ),
        "it should have run ArtifactTool"
      );
    assert(
        tr.stdOutContained("ArtifactTool.exe output"),
        "should have ArtifactTool output"
      );
    assert(
        tr.stdOutContained(`Cache miss:  ${process.platform}-${hash}`),
        "should have output stating cache miss"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert(
        tr.stdOutContained("set CacheRestored=false"),
        "'CacheRestored' variable should be set to false"
      );
    assert(
        tr.stdOutContained(`${process.platform}-${hash}=false`),
        "variable should be set to mark key as valid in build"
      );

    done();
  });

  it("RestoreCache handles artifact permissions errors gracefully", (done: MochaDone) => {
    const tp = path.join(__dirname, "RestoreCachePermissionsError.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(tr.invokedToolCount === 1, "should have run ArtifactTool once");
    assert(
        tr.ran(
          `/users/tmp/ArtifactTool.exe universal download --feed node-package-feed --service https://example.visualstudio.com/defaultcollection --package-name builddefinition1 --package-version 1.0.0-${process.platform}-${hash} --path /users/home/directory/tmp_cache --patvar UNIVERSAL_DOWNLOAD_PAT --verbosity verbose`
        ),
        "it should have run ArtifactTool"
      );
    assert(
        tr.stdOutContained("ArtifactTool.exe output"),
        "should have ArtifactTool output"
      );
    assert(
        tr.stdOutContained(`Cache miss:  ${process.platform}-${hash}`) !== true,
        "should not have output stating cache miss"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert(tr.warningIssues.length > 0, "should have permissions warnings");
    assert(
        tr.stdOutContained("warning;]Error: An unexpected error occurred while trying to download the package. Exit code(1) and error(An error occurred on the service. User lacks permission to complete this action.)"),
        "There should be a warning about permissions"
      );
    assert(
        tr.stdOutContained("warning;]Issue running universal packages tools"),
        "There should be a warning about universal packages tools"
      );
    assert(
        tr.stdOutContained("set CacheRestored=false") !== true,
        "'CacheRestored' variable should not be set"
      );
    assert(
        tr.stdOutContained(`${process.platform}-${hash}=`) !== true,
        "variable should not be set to mark key as valid in build"
      );

    done();
  });

  it("RestoreCache handles artifact tool download issues gracefully", (done: MochaDone) => {
    const tp = path.join(__dirname, "RestoreCacheArtifactToolErr.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(
        tr.stdOutContained("Error initializing artifact tool"),
        "should have error initializing artifact tool"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert(tr.warningIssues.length > 0, "should have warnings");
    assert(
        tr.stdOutContained("set CacheRestored=") !== true,
        "'CacheRestored' variable should not be set"
      );
    assert(
        tr.stdOutContained(`set ${process.platform}-${hash}=`) !== true,
        "variable should not be set to mark key as valid in build"
      );

    done();
  });
});

describe("SaveCache tests", function() {
  before(function() { });

  after(() => { });

  it("SaveCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    const tp = path.join(__dirname, "SaveCacheNoKeyFiles.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(
        tr.warningIssues.length > 0,
        true,
        "should have warnings from key file"
      );
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
        tr.stdout.indexOf("no key files matching:") >= 0,
        true,
        "should display 'no key files matching:'"
      );

    done();
  });

  it("SaveCache runs successfully with warnings if no target folders are found", function(done: MochaDone) {
    const tp = path.join(__dirname, "SaveCacheNoTargetFolders.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(
        tr.warningIssues.length > 0,
        true,
        "should have warnings from target folder"
      );
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
        tr.stdout.indexOf("no target folders matching:") >= 0,
        true,
        "should display 'no target folders matching:'"
      );

    done();
  });

  it("SaveCache is skipped if no run from repository fork", function(done: MochaDone) {
    const tp = path.join(__dirname, "SaveCacheFromFork.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(tr.warningIssues.length, 0, "should have no warnings");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
        tr.stdout.indexOf("result=Skipped;") >= 0,
        true,
        "task result should be: 'Skipped'"
      );
    assert.equal(
        tr.stdout.indexOf("Caches are not saved from forked repositories.") >= 0,
        true,
        "should display 'Caches are not saved from forked repositories.'"
      );

    done();
  });

  it("SaveCache doesn't create archive if cache hit", (done: MochaDone) => {
    const tp = path.join(__dirname, "SaveCacheCacheHit.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(
        tr.stdOutContained("Cache entry already exists for:"),
        "should have bailed out due to cache already present"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");

    done();
  });

  it("SaveCache doesn't create an archive if no matching hash", (done: MochaDone) => {
    const tp = path.join(__dirname, "SaveCacheNoHashMatch.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(
        tr.stdOutContained("Not caching artifact produced during build:"),
        "should have bailed out due to no matching hash"
      );
    assert(
        tr.stdOutContained("result=Skipped;"),
        "task result should be: 'Skipped'"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");

    done();
  });

  it("SaveCache handles artifact tool download issues gracefully", (done: MochaDone) => {
    const tp = path.join(__dirname, "SaveCacheArtifactToolErr.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(
        tr.stdOutContained("Error initializing artifact tool"),
        "should have error initializing artifact tool"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert(tr.warningIssues.length > 0, "should have warnings");
    assert(
        tr.stdOutContained("set CacheRestored=") !== true,
        "'CacheRestored' variable should not be set"
      );
    assert(
        tr.stdOutContained(`set ${process.platform}-${hash}=`) !== true,
        "variable should not be set to mark key as valid in build"
      );
    assert(
        tr.stdOutContained("Cache successfully saved") !== true,
        "should not have saved new cache entry"
      );

    done();
  });

  it("SaveCache handles artifact permissions errors gracefully", (done: MochaDone) => {
    const tp = path.join(__dirname, "SaveCachePermissionsError.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert(tr.warningIssues.length > 0, "should have warnings");
    assert(
        tr.stdOutContained("warning;]Issue saving package: Error: An unexpected error occurred while trying to push the package. Exit code(1) and error(An error occurred on the service. User lacks permission to complete this action.)"),
        "There should be a warning about permissions"
      );
    assert(
        tr.stdOutContained("warning;]Cache unsuccessfully saved. Find more information in logs above"),
        "There should be a warning about cache not being saved"
      );
    assert(
        tr.stdOutContained("Cache successfully saved") !== true,
        "should not have saved new cache entry"
      );

    done();
  });

  it("SaveCache creates an archive if cache miss", (done: MochaDone) => {
    const tp = path.join(__dirname, "SaveCacheCacheMiss.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();

    assert(
        tr.stdOutContained("Cache successfully saved"),
        "should have saved new cache entry"
      );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");

    done();
  });
});
