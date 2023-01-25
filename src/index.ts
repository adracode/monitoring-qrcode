import app from "./app"
import {ConfigurationManager} from "./services/data-management";

const port = process.env.PORT || 3000
ConfigurationManager.getInstance();
app.listen(port, () => console.log(`Server listening on port ${port}`));
process.on('exit', () => ConfigurationManager.getInstance().close());