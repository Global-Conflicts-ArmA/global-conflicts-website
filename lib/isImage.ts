export default function isFileImage(file) {
   return file && file['type'].split('/')[0] === 'image';
}