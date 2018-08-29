const os = require("os");
const AWS = require("aws-sdk");
const download = require("download-file");
const util = require("util");
const downloadPromise = util.promisify(download);
const path = require("path");
const fs = require("fs");
const binPerm = "0755";
const extract = util.promisify(require("extract-zip"));
const execAsync = util.promisify(require("child_process").exec);
const execCmd = "%s --kubeconfig %s %s";

const authenticatorPath = "/tmp/aws-iam-authenticator";
const kubectlPath = "/tmp/kubectl";
const buildTarget = "/tmp/build-target";
const rcPath = "/tmp/imagedefinitions.json";

const authenticatorMap = {
    "linux": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/linux/amd64/aws-iam-authenticator",
    "darwin": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/darwin/amd64/aws-iam-authenticator"
}

const kubectlMap = {
    "linux": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/linux/amd64/kubectl",
    "darwin": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/darwin/amd64/kubectl"
}

exports.handler = async(event) => {
    var jobId = event["CodePipeline.job"].id;
    var codepipeline = new AWS.CodePipeline();
    var s3Location = event["CodePipeline.job"]["data"]["inputArtifacts"][0]["location"]["s3Location"];
    var objectKey = s3Location.objectKey;
    var bucketName = s3Location.bucketName;
    await configureEnvironment();
    await downloadBuild(bucketName, objectKey);
    var imageDefinitions = require(rcPath);
    var output = await executeCommand(imageDefinitions.rcName, imageDefinitions.imageUri);
    await codepipeline.putJobSuccessResult({jobId: jobId}).promise();

    return output;
}

async function downloadBuild(bucketName, objectKey) {
    var s3 = new AWS.S3();
    var objectData = await s3.getObject({Bucket: bucketName, Key: objectKey}).promise();
    fs.writeFileSync(buildTarget, objectData.Body);
    await extract(buildTarget, {dir: path.dirname(rcPath)});
}

async function configureEnvironment() {
    if (os.platform() in authenticatorMap) {
        if (!fs.existsSync(authenticatorPath)) {
            var authenticatorUrl = authenticatorMap[os.platform()];
            await downloadPromise(authenticatorUrl, {directory: path.dirname(authenticatorPath), filename: path.basename(authenticatorPath)});
            fs.chmodSync(authenticatorPath, binPerm);
        }
    } 

    if (os.platform() in kubectlMap) {
        if (!fs.existsSync(kubectlPath)) {
            var kubectlUrl = kubectlMap[os.platform()];
            await downloadPromise(kubectlUrl, {directory: path.dirname(kubectlPath), filename: path.basename(kubectlPath)});
            fs.chmodSync(kubectlPath, binPerm);
        }
    }
}

async function executeCommand(rcName, imageUri) {
    return await execAsync(util.format(execCmd, kubectlPath, __dirname+"/config", "rolling-update "+rcName+" --image="+imageUri+" --image-pull-policy=Always"));
}