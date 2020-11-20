import { expect } from '../../../test-setup';

import { FilterClass, StringFilter } from '../../../../src/model/filters/search-filters';
import {
    SyntaxPart,
    FixedStringSyntax,
    StringOptionsSyntax,
    FixedLengthNumberSyntax,
    NumberSyntax
} from '../../../../src/model/filters/syntax-parts';

import {
    matchFilters,
    getSuggestions,
    applySuggestionToFilters
} from "../../../../src/model/filters/filter-matching";

const mockFilterClass = (syntaxParts: SyntaxPart[]) => (class MockFilterClass {
    static filterSyntax = syntaxParts;
    constructor(
        public builtFrom: string
    ) {}
} as unknown as FilterClass);

type MockFilter = { builtFrom?: string };

describe("Filter matching", () => {
    it("should match exactly matching filter classes", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
            mockFilterClass([new FixedStringSyntax('asd'), new FixedStringSyntax('qwe')])
        ]

        const match = matchFilters(availableFilters, "qweasd");

        expect(match.length).to.equal(2);
        expect(match[0]).to.be.instanceOf(StringFilter);
        expect((match[0] as StringFilter).filter).to.equal("");

        expect(match[1]).to.be.instanceOf(availableFilters[0]);
        expect((match[1] as MockFilter).builtFrom).to.equal("qweasd");
    });

    it("shouldn't match filter classes with only partially matching components", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
            mockFilterClass([new FixedStringSyntax('asd'), new FixedStringSyntax('qwe')])
        ]

        const match = matchFilters(availableFilters, "qw");

        expect(match.length).to.equal(1);
        expect(match[0]).to.be.instanceOf(StringFilter);
        expect((match[0] as StringFilter).filter).to.equal("qw");
    });

    it("shouldn't match filter classes with a full + partial matching components", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
            mockFilterClass([new FixedStringSyntax('asd'), new FixedStringSyntax('qwe')])
        ]

        const match = matchFilters(availableFilters, "qweas");

        expect(match.length).to.equal(1);
        expect(match[0]).to.be.instanceOf(StringFilter);
        expect((match[0] as StringFilter).filter).to.equal("qweas");
    });

    it("shouldn't match anything given an empty string", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
            mockFilterClass([new FixedStringSyntax('asd'), new FixedStringSyntax('qwe')])
        ]

        const match = matchFilters(availableFilters, "");

        expect(match.length).to.equal(1);
        expect(match[0]).to.be.instanceOf(StringFilter);
        expect((match[0] as StringFilter).filter).to.equal("");
    });

    it("should match ignoring outside whitespace", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
            mockFilterClass([new FixedStringSyntax('asd'), new FixedStringSyntax('qwe')])
        ]

        const match = matchFilters(availableFilters, "   qweasd   ");

        expect(match.length).to.equal(2);
        expect(match[0]).to.be.instanceOf(StringFilter);
        expect((match[0] as StringFilter).filter).to.equal("");

        expect(match[1]).to.be.instanceOf(availableFilters[0]);
        expect((match[1] as MockFilter).builtFrom).to.equal("qweasd");
    });

    it("should match multiple filters", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
            mockFilterClass([new FixedStringSyntax('asd'), new FixedStringSyntax('qwe')])
        ]

        const match = matchFilters(availableFilters, "asdqwe qweasd 123");

        expect(match.length).to.equal(3);
        expect(match[0]).to.be.instanceOf(StringFilter);
        expect((match[0] as StringFilter).filter).to.equal("123");

        expect(match[1]).to.be.instanceOf(availableFilters[0]);
        expect((match[1] as MockFilter).builtFrom).to.equal("qweasd");

        expect(match[2]).to.be.instanceOf(availableFilters[1]);
        expect((match[2] as MockFilter).builtFrom).to.equal("asdqwe");
    });
});

describe("Suggestion generation", () => {
    it("should suggest completing a string part", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe')])
        ];

        const suggestions = getSuggestions(availableFilters, "qw");

        expect(suggestions[0]).to.deep.equal({
            index: 0,
            showAs: "qwe",
            value: "qwe",
            filterClass: availableFilters[0],
            type: 'full'
        });
    });

    it("should only show exact completions given an exact match", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe')]),
            mockFilterClass([new FixedStringSyntax('qweasd')])
        ];

        const suggestions = getSuggestions(availableFilters, "qwe");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "qwe",
                value: "qwe",
                filterClass: availableFilters[0],
                type: 'full'
            }
        ]);
    });

    it("should suggest the final part, given a multi-step full match", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new NumberSyntax()])
        ];

        const suggestions = getSuggestions(availableFilters, "qwe123");

        expect(suggestions).to.deep.equal([
            {
                index: 3,
                showAs: "123",
                value: "123",
                filterClass: availableFilters[0],
                type: 'full'
            }
        ]);
    });

    it("should not suggest completions after the end of the match", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('status')])
        ];

        const suggestions = getSuggestions(availableFilters, "statuses");

        expect(suggestions.length).to.equal(0);
    });

    it("should suggest completions at the end of the string", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('qwe'), new FixedStringSyntax('asd')]),
        ];

        const suggestions = getSuggestions(availableFilters, "qwe");

        expect(suggestions[0]).to.deep.equal({
            index: 3,
            showAs: "asd",
            value: "asd",
            filterClass: availableFilters[0],
            type: 'full'
        });
    });

    it("should suggest the matching string options", () => {
        const availableFilters = [
            mockFilterClass([new StringOptionsSyntax(['ab', 'ac', 'def'])])
        ];

        const suggestions = getSuggestions(availableFilters, "a");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "ab",
                value: "ab",
                filterClass: availableFilters[0],
                type: 'full'
            },
            {
                index: 0,
                showAs: "ac",
                value: "ac",
                filterClass: availableFilters[0],
                type: 'full'
            },
        ]);
    });

    it("should include suggestions from multiple filters", () => {
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('abcdef')]),
            mockFilterClass([new StringOptionsSyntax(['ab', 'ac'])])
        ];

        const suggestions = getSuggestions(availableFilters, "a");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "abcdef",
                value: "abcdef",
                filterClass: availableFilters[0],
                type: 'full'
            },
            {
                index: 0,
                showAs: "ab",
                value: "ab",
                filterClass: availableFilters[1],
                type: 'full'
            },
            {
                index: 0,
                showAs: "ac",
                value: "ac",
                filterClass: availableFilters[1],
                type: 'full'
            },
        ]);
    });

    it("should include suggestions for the initial unmatched part of a filter", () => {
        const availableFilters = [
            mockFilterClass([
                new StringOptionsSyntax(['ab', 'ac']),
                new StringOptionsSyntax(['=', '>=', '<=']),
            ])
        ];

        const suggestions = getSuggestions(availableFilters, "a");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "ab",
                value: "ab",
                filterClass: availableFilters[0],
                type: 'partial'
            },
            {
                index: 0,
                showAs: "ac",
                value: "ac",
                filterClass: availableFilters[0],
                type: 'partial'
            }
        ]);
    });

    it("should include suggestions for subsequent unmatched parts of a filter", () => {
        const availableFilters = [
            mockFilterClass([
                new StringOptionsSyntax(['ab', 'ac']),
                new StringOptionsSyntax(['=', '>=', '<=']),
            ])
        ];

        const suggestions = getSuggestions(availableFilters, "ab");

        expect(suggestions).to.deep.equal([
            {
                index: 2,
                showAs: "=",
                value: "=",
                filterClass: availableFilters[0],
                type: 'full'
            },
            {
                index: 2,
                showAs: ">=",
                value: ">=",
                filterClass: availableFilters[0],
                type: 'full'
            },
            {
                index: 2,
                showAs: "<=",
                value: "<=",
                filterClass: availableFilters[0],
                type: 'full'
            }
        ]);
    });

    it("should skip suggestions forwards given a full+partial option match in one part of a filter", () => {
        const availableFilters = [
            mockFilterClass([
                new FixedStringSyntax("status"),
                new StringOptionsSyntax(['=', '==']),
                new FixedLengthNumberSyntax(3)
            ])
        ];

        const suggestions = getSuggestions(availableFilters, "status=");

        expect(suggestions).to.deep.equal([
            {
                index: 7,
                showAs: "{3-digit number}",
                value: "",
                template: true,
                filterClass: availableFilters[0],
                type: 'partial'
            }
            // I.e. it doesn't show == here, it shows the final suggestion instead, since
            // that's probably what you're looking for now.
        ]);
    });

    it("should include suggestions for most full-matched option, given multiple options", () => {
        // Similar to the above test, but given competing filters, not competing string options
        const availableFilters = [
            mockFilterClass([new FixedStringSyntax('bodySize'), new StringOptionsSyntax(['=', '>=', '<='])]),
            mockFilterClass([new FixedStringSyntax('body'), new StringOptionsSyntax(['=', '=='])])
        ];

        const suggestions = getSuggestions(availableFilters, "body");

        expect(suggestions).to.deep.equal([
            {
                index: 4,
                showAs: "=",
                value: "=",
                filterClass: availableFilters[1],
                type: 'full'
            },
            {
                index: 4,
                showAs: "==",
                value: "==",
                filterClass: availableFilters[1],
                type: 'full'
            }
        ]);
    });

    it("should combine suggestions given single option parts of a filter", () => {
        const availableFilters = [
            mockFilterClass([
                new FixedStringSyntax('status'),
                new StringOptionsSyntax(['=', '>=', '<=']),
            ])
        ];

        const suggestions = getSuggestions(availableFilters, "sta");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "status=",
                value: "status=",
                filterClass: availableFilters[0],
                type: 'full'
            },
            {
                index: 0,
                showAs: "status>=",
                value: "status>=",
                filterClass: availableFilters[0],
                type: 'full'
            },
            {
                index: 0,
                showAs: "status<=",
                value: "status<=",
                filterClass: availableFilters[0],
                type: 'full'
            }
        ]);
    });

    it("should successfully combine suggestions if all parts of a filter are single-option", () => {
        const availableFilters = [
            mockFilterClass([
                new FixedStringSyntax('status'),
                new StringOptionsSyntax(['=404']),
            ])
        ];

        const suggestions = getSuggestions(availableFilters, "sta");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "status=404",
                value: "status=404",
                filterClass: availableFilters[0],
                type: 'full'
            }
        ]);
    });

    it("should stop combining suggestions if a template value is found", () => {
        const availableFilters = [
            mockFilterClass([
                new FixedStringSyntax('bodySize='),
                new NumberSyntax(),
                new FixedStringSyntax('bytes')
            ])
        ];

        const suggestions = getSuggestions(availableFilters, "bodySize");

        expect(suggestions).to.deep.equal([
            {
                index: 0,
                showAs: "bodySize={number}",
                value: "bodySize=",
                template: true,
                filterClass: availableFilters[0],
                type: 'partial'
            }
        ]);
    });
});

describe("Applying suggestions", () => {
    it("completes initial single-part suggestions", () => {
        const filterClass = mockFilterClass([
            new FixedStringSyntax('status'),
            new StringOptionsSyntax(['=404']),
        ]);

        const result = applySuggestionToFilters(
            [new StringFilter("sta")],
            { index: 0, value: "status", showAs: "STATUS", filterClass, type: 'partial' }
        );

        expect(result.length).to.equal(1);
        const updatedText = result[0].filter;
        expect(updatedText).to.equal("status");
    });

    it("completes second part suggestions", () => {
        const filterClass = mockFilterClass([
            new FixedStringSyntax('status'),
            new StringOptionsSyntax(['=', '!=']),
            new NumberSyntax()
        ]);

        const result = applySuggestionToFilters(
            [new StringFilter("status!")],
            { index: 6, value: "!=", showAs: "!=", filterClass, type: 'partial' }
        );

        expect(result.length).to.equal(1);
        const updatedText = result[0].filter;
        expect(updatedText).to.equal("status!=");
    });

    it("does nothing for template suggestions", () => {
        const filterClass = mockFilterClass([
            new FixedStringSyntax('status='),
            new NumberSyntax()
        ]);

        const result = applySuggestionToFilters(
            [new StringFilter("status=")],
            { index: 7, value: "", showAs: "{number}", template: true, filterClass, type: 'partial' }
        );

        expect(result.length).to.equal(1);
        const updatedText = result[0].filter;
        expect(updatedText).to.equal("status=");
    });

    it("fully completes and creates filters with final part suggestions", () => {
        const filterClass = mockFilterClass([
            new FixedStringSyntax('status'),
            new StringOptionsSyntax(['=', '!=']),
            new NumberSyntax()
        ]);

        const result = applySuggestionToFilters(
            [new StringFilter("status!=40")],
            { index: 8, value: "404", showAs: "404", filterClass, type: 'full' }
        );

        expect(result.length).to.equal(2);

        const updatedText = result[0].filter;
        expect(updatedText).to.equal("");

        expect((result[1] as MockFilter).builtFrom).to.equal("status!=404");
    });
});