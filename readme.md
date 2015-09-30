#Mongo Index enSURE

MongoDB is schema less db and usually you not need anything to manage its schema.

However there is important part that need to be precisely managed - indexes.

When you have only one app and it is small its enough to use `ensureIndex`. Though
even in this case you have to manually delete unused indexes.

As your app grows you will get more and more indexes to manage. Cost of keeping of
unused indexes or absent indexes can be very high. With bigger app more likely
you will have many environments (dev, test, production) and some of them can
have multiple instances (like several production instances).

This small utility is designed to provide some small assistance in managing indexes.
It uses JSON file with index configuration that can be edited manually or obtained
from existing server. Based on this file utility can update mongodb to match it -
create or delete indexes as appropriate.

We didn't spent too much time on it. So prior to real update run the `check` command
first to see list of required changes

## Installation

`npm install misure -g`

## Usage

```
misure command [options]
```

```
Commands:
  capture  Captures (reads) db infomration
  update   Updates database based on --config file
  check    Check for required updates based on --config file

Options:
  -h, --host      Hostname                                              [string]
  -d, --db        Database                                              [string]
  --port          Port                                 [string] [default: 27017]
  -a, --auth      Authentication                        [string] [default: true]
  -u, --user      Username                                              [string]
  -p, --password  Password                                              [string]
  --config        JSON file with db information
                                             [string] [default: "./misure.json"]
  -?, --help      Show help                                            [boolean]
```

## MIT License

Copyright (c) [PushOk Software](http://www.pushok.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
